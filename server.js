// server.js – Full backend to serve frontend and handle Hunyuan3D job submission
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const obj2gltf = require('obj2gltf');
const { v4: uuidv4 } = require('uuid');
const tencentcloud = require("tencentcloud-sdk-nodejs");
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files (index.html, img/, public/models, etc)
app.use(express.static(__dirname));
app.use('/models', express.static(path.join(__dirname, 'public/models')));

// Tencent Cloud SDK client setup
const client = new HunyuanClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: { httpProfile: { endpoint: "hunyuan.tencentcloudapi.com" } },
});

app.post('/api/generate', upload.array('images', 4), async (req, res) => {
  try {
    const prompt = req.body.prompt?.trim();
    const files = req.files || [];

    if (!prompt && files.length === 0) {
      return res.status(400).json({ error: "Please enter a prompt or upload at least one image." });
    }

    const params = { Num: 1 };
    if (prompt && files.length === 0) {
      params.Prompt = prompt;
    } else {
      const imgPath = files[0].path;
      const base64 = fs.readFileSync(imgPath).toString('base64');
      params.ImageBase64 = base64;
    }

    const { JobId } = await client.SubmitHunyuanTo3DJob(params);

    let status = 'WAIT';
    let result;
    const start = Date.now();
    while (Date.now() - start < 60000) {
      await new Promise((r) => setTimeout(r, 6000));
      const resp = await client.QueryHunyuanTo3DJob({ JobId });
      status = resp.Status;
      if (status === 'DONE') {
        result = resp.ResultFile3Ds?.[0]?.File3D || [];
        break;
      }
      if (status === 'FAIL') {
        return res.status(500).json({ error: "Model generation failed." });
      }
    }

    if (!result || result.length === 0) {
      return res.status(500).json({ error: "Model generation returned no usable files." });
    }

    const objFile = result.find(f => f.Type === 'OBJ');
    if (!objFile) return res.status(500).json({ error: "Only OBJ output available, none found." });

    // Download ZIP
    const zipRes = await axios.get(objFile.Url, { responseType: 'arraybuffer' });
    const zipPath = path.join('uploads', `${JobId}.zip`);
    fs.writeFileSync(zipPath, zipRes.data);

    // Extract ZIP (naive method assuming model.obj exists)
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    const extractPath = path.join('uploads', JobId);
    zip.extractAllTo(extractPath, true);

    const objPath = path.join(extractPath, 'model.obj');
    const glbBuffer = await obj2gltf(objPath, { binary: true });
    const modelId = uuidv4();
    const outputPath = path.join(__dirname, 'public/models', `${modelId}.glb`);
    fs.writeFileSync(outputPath, Buffer.from(glbBuffer));

    return res.json({ modelUrl: `/models/${modelId}.glb` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
