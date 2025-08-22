export interface SecurityGroup {
  id: string;
  inbound: number[];
}

export interface Nacl {
  id: string;
  deniesEphemeral: boolean;
  entry?: string;
}

export interface RouteTable {
  id: string;
  hasInternet: boolean;
}

export interface Ssm {
  online: boolean;
  logs?: string;
}

export interface OsInfo {
  distro: string;
  hasEicPackage: boolean;
}

export interface DiskInfo {
  full: boolean;
  df: string;
}

export interface DiagnoseInput {
  statusChecks: boolean;
  publicIp?: string | null;
  eicEndpoint?: boolean;
  securityGroup: SecurityGroup;
  nacl: Nacl;
  routeTable: RouteTable;
  ssm: Ssm;
  os: OsInfo;
  disk: DiskInfo;
  region?: string;
}

export interface DiagnoseOutput {
  exitCode: number;
  report: string;
}

export function diagnose(data: DiagnoseInput): DiagnoseOutput {
  const issues: string[] = [];
  const remedies: string[] = [];

  if (!data.publicIp && !data.eicEndpoint) {
    issues.push("browser Connect will fail; use SSM");
  }

  if (!data.securityGroup.inbound.includes(22)) {
    issues.push(`security group ${data.securityGroup.id} missing inbound 22`);
    remedies.push(
      `aws ec2 authorize-security-group-ingress --group-id ${data.securityGroup.id} --protocol tcp --port 22 --cidr 0.0.0.0/0`,
    );
  }

  if (data.nacl.deniesEphemeral) {
    const entry = data.nacl.entry ? ` entry ${data.nacl.entry}` : "";
    issues.push(`network ACL ${data.nacl.id} denies ephemeral${entry}`);
    remedies.push(
      `update NACL ${data.nacl.id} to allow ephemeral ports 1024-65535`,
    );
  }

  if (!data.routeTable.hasInternet) {
    issues.push(`route table ${data.routeTable.id} missing IGW/NAT`);
    remedies.push(
      `attach an Internet Gateway or NAT Gateway to route table ${data.routeTable.id}`,
    );
  }

  if (
    data.ssm.online &&
    data.ssm.logs &&
    /sshd\s+stopped/i.test(data.ssm.logs)
  ) {
    issues.push("sshd service stopped");
    remedies.push("restart sshd via `sudo systemctl restart ssh`");
  }

  if (!data.ssm.online) {
    issues.push("SSM agent offline");
    remedies.push("attach instance profile with AmazonSSMManagedInstanceCore");
  }

  if (data.os.distro.toLowerCase() === "ubuntu" && !data.os.hasEicPackage) {
    issues.push("ec2-instance-connect package missing");
    remedies.push(
      "install with `sudo apt-get install -y ec2-instance-connect`",
    );
  }

  if (data.disk.full) {
    issues.push("disk 100% full");
    remedies.push("free up disk space");
  }

  const lines: string[] = [
    "# EC2 Connect Diagnose Report",
    "## Decision Tree",
    ...issues.map((i) => `- ${i}`),
    "## Remediation",
    ...remedies.map((r) => `- ${r}`),
  ];

  if (data.disk.full) {
    lines.push("### Disk Usage");
    lines.push("```\n" + data.disk.df + "\n```");
  }

  return {
    exitCode: issues.length > 0 ? 1 : 0,
    report: lines.join("\n") + "\n",
  };
}
