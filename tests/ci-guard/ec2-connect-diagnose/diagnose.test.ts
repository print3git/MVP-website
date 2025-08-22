import fs from "fs";
import path from "path";
import { diagnose } from "../../../scripts/ci-guard/ec2-connect-diagnose/diagnose";

function load(name: string) {
  const file = path.join(__dirname, "__fixtures__", name);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("ec2-connect-diagnose", () => {
  test("instance checks pass -> network checks run", () => {
    const data = load("sg-missing-22.json");
    const res = diagnose(data);
    expect(res.exitCode).toBe(1);
    expect(res.report).toMatch(/security group sg-123 missing inbound 22/);
  });

  test("no public IP and no EIC endpoint", () => {
    const data = load("no-public-ip.json");
    const res = diagnose(data);
    expect(res.exitCode).toBe(1);
    expect(res.report).toMatch(/browser Connect will fail; use SSM/);
  });

  test("security group missing inbound 22", () => {
    const data = load("sg-missing-22.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/security group sg-123 missing inbound 22/);
    expect(res.report).toMatch(/authorize-security-group-ingress/);
  });

  test("NACL denies ephemeral", () => {
    const data = load("nacl-deny-ephemeral.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/network ACL acl-1 denies ephemeral/);
  });

  test("route table missing IGW/NAT", () => {
    const data = load("rtb-missing-igw.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/route table rtb-1 missing IGW\/NAT/);
  });

  test("SSM online with sshd stopped", () => {
    const data = load("ssm-online-sshd-stopped.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/sshd service stopped/);
    expect(res.report).toMatch(/restart sshd/);
  });

  test("SSM offline", () => {
    const data = load("ssm-offline.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/SSM agent offline/);
    expect(res.report).toMatch(/AmazonSSMManagedInstanceCore/);
  });

  test("missing ec2-instance-connect package", () => {
    const data = load("missing-eic-package.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/ec2-instance-connect package missing/);
    expect(res.report).toMatch(/apt-get install -y ec2-instance-connect/);
  });

  test("disk 100% full", () => {
    const data = load("disk-full.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/disk 100% full/);
    expect(res.report).toMatch(/Filesystem/);
    expect(res.report).toMatch(/free up disk space/);
  });

  test("markdown contains decision tree and remediation", () => {
    const data = load("sg-missing-22.json");
    const res = diagnose(data);
    expect(res.report).toMatch(/## Decision Tree/);
    expect(res.report).toMatch(/## Remediation/);
  });

  test("reports deterministic across regions", () => {
    const base = load("baseline.json");
    const us = diagnose({ ...base, region: "us-east-1" }).report;
    const eu = diagnose({ ...base, region: "eu-west-1" }).report;
    expect(us).toBe(eu);
  });

  test("exit code reflects blockers", () => {
    const good = load("baseline.json");
    const bad = load("sg-missing-22.json");
    expect(diagnose(good).exitCode).toBe(0);
    expect(diagnose(bad).exitCode).toBe(1);
  });
});
