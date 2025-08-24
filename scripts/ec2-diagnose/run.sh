#!/usr/bin/env bash
set -euo pipefail

# EC2/SSH diagnostic script
# Inputs via environment:
#   INSTANCE_ID or TAG (format Key=Value)
#   REGION
# Outputs: ec2-diagnose.md and step outputs for GitHub Actions

INSTANCE_ID=${INSTANCE_ID:-}
TAG=${TAG:-}
REGION=${REGION:-}
REPORT="ec2-diagnose.md"
GITHUB_OUTPUT_FILE=${GITHUB_OUTPUT:-/tmp/ec2-diagnose.out}

fail() {
  OVERALL_PASS=0
  echo "FAIL";
}
pass(){
  echo "PASS";
}

overall_note=""
OVERALL_PASS=1

if [[ -z "$REGION" ]]; then
  echo "REGION is required" >&2
  exit 1
fi

if [[ -z "$INSTANCE_ID" && -n "$TAG" ]]; then
  KEY=${TAG%%=*}
  VAL=${TAG#*=}
  INSTANCE_ID=$(aws ec2 describe-instances --region "$REGION" --filters "Name=tag:${KEY},Values=${VAL}" --query 'Reservations[0].Instances[0].InstanceId' --output text)
fi

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "Unable to determine INSTANCE_ID" >&2
  exit 1
fi

inst_json=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0]' --output json)
subnet_id=$(echo "$inst_json" | jq -r '.SubnetId')
sg_ids=$(echo "$inst_json" | jq -r '.SecurityGroups[].GroupId' | tr '\n' ' ')
public_ip=$(echo "$inst_json" | jq -r '.PublicIpAddress')

status_json=$(aws ec2 describe-instance-status --region "$REGION" --include-all-instances --instance-ids "$INSTANCE_ID" --query 'InstanceStatuses[0]' --output json)
inst_status=$(echo "$status_json" | jq -r '.InstanceStatus.Status')
sys_status=$(echo "$status_json" | jq -r '.SystemStatus.Status')
if [[ "$inst_status" == "ok" && "$sys_status" == "ok" ]]; then
  status_result="$(pass)"
else
  status_result="$(fail)"
  overall_note+="\n- Instance status checks failing"
fi

# Public IP / EIC check
if [[ "$public_ip" == "null" || -z "$public_ip" ]]; then
  public_result="$(fail)"
  eic_state=$(aws ec2 describe-instance-connect-endpoints --region "$REGION" --filters "Name=subnet-id,Values=$subnet_id" --query 'InstanceConnectEndpoints[0].State' --output text 2>/dev/null || echo "None")
  if [[ "$eic_state" == "None" || "$eic_state" == "None" ]]; then
    eic_note="No public IP and no EC2 Instance Connect endpoint in subnet. Use SSM or add endpoint."
  else
    eic_note="No public IP; EC2 Instance Connect endpoint present ($eic_state)."
  fi
else
  public_result="$(pass)"
  eic_note="Public IP: $public_ip"
fi

# Security groups
sg_json=$(aws ec2 describe-security-groups --region "$REGION" --group-ids $sg_ids --output json)
ssh_in=$(echo "$sg_json" | jq '[.SecurityGroups[].IpPermissions[] | select(.FromPort<=22 and .ToPort>=22 and .IpProtocol=="tcp")]|length')
if [[ "$ssh_in" -gt 0 ]]; then
  sg_ssh_result="$(pass)"
else
  sg_ssh_result="$(fail)"
  overall_note+="\n- Security group lacks inbound 22"
fi
eg_ephemeral=$(echo "$sg_json" | jq '[.SecurityGroups[].IpPermissionsEgress[] | select(.IpProtocol=="-1" or (.FromPort<=1024 and .ToPort>=65535))]|length')
if [[ "$eg_ephemeral" -gt 0 ]]; then
  sg_out_result="$(pass)"
else
  sg_out_result="WARN"
fi

# NACL
nacl_json=$(aws ec2 describe-network-acls --region "$REGION" --filters "Name=association.subnet-id,Values=$subnet_id" --query 'NetworkAcls[0]' --output json)
in_nacl=$(echo "$nacl_json" | jq '[.Entries[] | select(.RuleAction=="allow" and .Egress==false and (.PortRange.From<=22 and .PortRange.To>=22))]|length')
out_nacl=$(echo "$nacl_json" | jq '[.Entries[] | select(.RuleAction=="allow" and .Egress==true and (.PortRange.From<=22 and .PortRange.To>=65535))]|length')
if [[ "$in_nacl" -gt 0 && "$out_nacl" -gt 0 ]]; then
  nacl_result="$(pass)"
else
  nacl_result="$(fail)"
  overall_note+="\n- NACL rules block SSH or ephemeral outbound"
fi

# Route table
route=$(aws ec2 describe-route-tables --region "$REGION" --filters "Name=association.subnet-id,Values=$subnet_id" --query 'RouteTables[0].Routes[] | select(.DestinationCidrBlock==`0.0.0.0/0`).GatewayId' --output text)
if [[ "$route" == igw-* || "$route" == nat-* ]]; then
  route_result="$(pass)"
else
  route_result="$(fail)"
  overall_note+="\n- Route table lacks internet gateway/NAT path"
fi

# Reachability Analyzer (optional)
if aws reachabilityanalyzer list-scenarios --region "$REGION" >/dev/null 2>&1; then
  reachability="available"
else
  reachability="no-permission"
fi

# SSM status
ssm_json=$(aws ssm describe-instance-information --region "$REGION" --filters Key=InstanceIds,Values=$INSTANCE_ID --query 'InstanceInformationList[0]' --output json 2>/dev/null || echo "null")
if [[ "$ssm_json" == "null" ]]; then
  ssm_status="offline"
else
  ssm_status="online"
fi

sshd_info=""
if [[ "$ssm_status" == "online" ]]; then
  cmd_id=$(aws ssm send-command --region "$REGION" --document-name AWS-RunShellScript --parameters commands=['systemctl status sshd || true','ss -tlnp | grep :22 || true','command -v ec2-instance-connect || dpkg -l ec2-instance-connect || true','grep -E "^AuthorizedKeysCommand" /etc/ssh/sshd_config || true'] --instance-ids "$INSTANCE_ID" --query 'Command.CommandId' --output text)
  aws ssm wait command-executed --region "$REGION" --command-id "$cmd_id" --instance-id "$INSTANCE_ID" >/dev/null
  sshd_info=$(aws ssm get-command-invocation --region "$REGION" --command-id "$cmd_id" --instance-id "$INSTANCE_ID" --query 'StandardOutputContent' --output text)
fi

# Markdown report
{
  echo "# EC2 diagnose report for $INSTANCE_ID"
  echo ""
  echo "## Instance status"
  echo "- Status checks: $status_result"
  echo "## Networking"
  echo "- Public IP: $public_result - $eic_note"
  echo "- Security Group inbound 22: $sg_ssh_result"
  echo "- Security Group outbound ephemeral: $sg_out_result"
  echo "- NACL allows SSH/ephemeral: $nacl_result"
  echo "- Route to internet: $route_result"
  echo "- Reachability Analyzer: $reachability"
  echo "## SSM"
  echo "- SSM online: $ssm_status"
  if [[ -n "$sshd_info" ]]; then
    echo "\n### Remote checks"
    echo '```
'$sshd_info'
```'
  fi
  if [[ -n "$overall_note" ]]; then
    echo "\n## Remediation"
    echo "$overall_note"
  fi
} > "$REPORT"

if [[ "$OVERALL_PASS" -eq 1 ]]; then
  echo "overall=pass" >> "$GITHUB_OUTPUT_FILE"
  echo "ssh_pass=$sg_ssh_result" >> "$GITHUB_OUTPUT_FILE"
  echo "ssm_online=$([[ "$ssm_status" == online ]] && echo yes || echo no)" >> "$GITHUB_OUTPUT_FILE"
  exit 0
else
  echo "overall=fail" >> "$GITHUB_OUTPUT_FILE"
  echo "ssh_pass=$sg_ssh_result" >> "$GITHUB_OUTPUT_FILE"
  echo "ssm_online=$([[ "$ssm_status" == online ]] && echo yes || echo no)" >> "$GITHUB_OUTPUT_FILE"
  exit 1
fi

