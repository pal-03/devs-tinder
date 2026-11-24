#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--apply" ]]; then
  echo "Run with --apply using an AWS administrator session, not the application credentials."
  exit 1
fi
export AWS_DEFAULT_REGION=ap-southeast-2
account=$(aws sts get-caller-identity --query Account --output text)
[[ "$account" == "569845140328" ]] || { echo "Unexpected AWS account"; exit 1; }
topic="arn:aws:sns:$AWS_DEFAULT_REGION:$account:devtinder-ses-feedback"
queue="arn:aws:sqs:$AWS_DEFAULT_REGION:$account:devtinder-ses-feedback"
identity="arn:aws:ses:$AWS_DEFAULT_REGION:$account:identity/devs-tinder.in"

# Refuse to replace a policy on a resource not created by this script.
existing=$(aws sns list-topics --query "Topics[?TopicArn=='$topic'].TopicArn" --output text)
if [[ -n "$existing" ]]; then
  owner=$(aws sns list-tags-for-resource --resource-arn "$topic" --query "Tags[?Key=='ManagedBy'].Value | [0]" --output text)
  [[ "$owner" == "DevTinderEmailFeedback" ]] || { echo "Existing topic is not managed by this script"; exit 1; }
fi
aws sns create-topic --name devtinder-ses-feedback --tags Key=ManagedBy,Value=DevTinderEmailFeedback --attributes SignatureVersion=2 >/dev/null
topicPolicy=$(jq -nc --arg t "$topic" --arg a "$account" --arg i "$identity" '{Version:"2012-10-17",Statement:[{Sid:"OnlyOurSesIdentity",Effect:"Allow",Principal:{Service:"ses.amazonaws.com"},Action:"sns:Publish",Resource:$t,Condition:{StringEquals:{"AWS:SourceAccount":$a},ArnEquals:{"AWS:SourceArn":$i}}}]}')
aws sns set-topic-attributes --topic-arn "$topic" --attribute-name Policy --attribute-value "$topicPolicy"

for name in devtinder-ses-feedback-dlq devtinder-ses-feedback; do
  old=$(aws sqs get-queue-url --queue-name "$name" --query QueueUrl --output text 2>/dev/null || true)
  if [[ -n "$old" ]]; then
    owner=$(aws sqs list-queue-tags --queue-url "$old" --query Tags.ManagedBy --output text)
    [[ "$owner" == "DevTinderEmailFeedback" ]] || { echo "Existing queue is not managed by this script"; exit 1; }
  fi
  aws sqs create-queue --queue-name "$name" --tags ManagedBy=DevTinderEmailFeedback --attributes SqsManagedSseEnabled=true,MessageRetentionPeriod=1209600 >/dev/null
done
dlqUrl=$(aws sqs get-queue-url --queue-name devtinder-ses-feedback-dlq --query QueueUrl --output text)
queueUrl=$(aws sqs get-queue-url --queue-name devtinder-ses-feedback --query QueueUrl --output text)
queuePolicy=$(jq -nc --arg q "$queue" --arg t "$topic" --arg a "$account" '{Version:"2012-10-17",Statement:[{Sid:"OnlyOurFeedbackTopic",Effect:"Allow",Principal:{Service:"sns.amazonaws.com"},Action:"sqs:SendMessage",Resource:$q,Condition:{ArnEquals:{"aws:SourceArn":$t},StringEquals:{"aws:SourceAccount":$a}}}]}')
redrive=$(jq -nc --arg d "${queue}-dlq" '{deadLetterTargetArn:$d,maxReceiveCount:"5"}')
attributes=$(jq -nc --arg p "$queuePolicy" --arg r "$redrive" '{Policy:$p,RedrivePolicy:$r,ReceiveMessageWaitTimeSeconds:"20",VisibilityTimeout:"60"}')
aws sqs set-queue-attributes --queue-url "$queueUrl" --attributes "$attributes"
allow=$(jq -nc --arg q "$queue" '{redrivePermission:"byQueue",sourceQueueArns:[$q]}')
aws sqs set-queue-attributes --queue-url "$dlqUrl" --attributes "$(jq -nc --arg a "$allow" '{RedriveAllowPolicy:$a}')"
subscription=$(aws sns list-subscriptions-by-topic --topic-arn "$topic" --query "Subscriptions[?Endpoint=='$queue'].SubscriptionArn | [0]" --output text)
if [[ "$subscription" == "None" || -z "$subscription" ]]; then
  aws sns subscribe --topic-arn "$topic" --protocol sqs --notification-endpoint "$queue" --attributes RawMessageDelivery=false >/dev/null
fi
consumerPolicy=$(jq -nc --arg q "$queue" '{Version:"2012-10-17",Statement:[{Effect:"Allow",Action:["sqs:ReceiveMessage","sqs:DeleteMessage","sqs:GetQueueAttributes"],Resource:$q}]}')
aws iam put-user-policy --user-name ses-admin --policy-name DevTinderFeedbackConsumer --policy-document "$consumerPolicy"
for type in Bounce Complaint; do
  aws ses set-identity-notification-topic --identity devs-tinder.in --notification-type "$type" --sns-topic "$topic"
done
echo "SES_FEEDBACK_QUEUE_URL=$queueUrl"
echo "SES_FEEDBACK_TOPIC_ARN=$topic"
aws ses get-identity-notification-attributes --identities devs-tinder.in
