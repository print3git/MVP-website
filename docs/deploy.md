# Deploying with Helm

This project includes a Helm chart under `deploy/helm/print2`. Tagged releases (`v*.*.*`) package the chart and upload it as a release asset.

Download the package from the release page and install it with:

```bash
helm install my-print2 print2-0.1.0.tgz \
  --set image.tag=<version> \
  --set db.url=<database-url> \
  --set stripe.publishableKey=<key> \
  --set stripe.secretKey=<key> \
  --set ai.key=<key> \
  --set env=production
```

Adjust the values to suit your environment.
