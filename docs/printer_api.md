# Printer Service API

The print worker sends completed jobs to the printer service via `POST`
requests. The request body is JSON with the following fields:

```json
{
  "modelUrl": "https://example.com/models/<file>.glb",
  "shipping": {
    /* arbitrary shipping details */
  },
  "etchName": "optional name to etch on the model"
}
```

`etchName` will be `null` if the purchaser did not request engraving.
Ensure your printer API accepts this field even if it is omitted or `null`.
