import boto3, os, os.path as p

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

def upload_to_s3(local_path: str) -> str:
    bucket = os.getenv("S3_BUCKET")
    key    = f"outputs/{p.basename(local_path)}"
    s3.upload_file(local_path, bucket, key, ExtraArgs={"ACL": "public-read"})
    return f"https://{bucket}.s3.amazonaws.com/{key}"
