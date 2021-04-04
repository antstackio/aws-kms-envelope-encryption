const express = require("express");
const AWS = require("aws-sdk");
const upload = require("express-fileupload");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { encrypt, decrypt } = require("./crypt");
require("dotenv").config();

// initialize an express application
const app = express();

// Update the region for resources in config for AWS
AWS.config.update({ region: "ap-south-1" });

// instantiate the S3, KMS and DynamoDB objects
const s3 = new AWS.S3();
const kms = new AWS.KMS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(upload());

let params = {};

// Endpoint to get listings of data
app.get("/", async (req, res) => {
    params = {
        TableName: process.env.TABLE_NAME,
    }
    try {
        const scanResult = await dynamodb.scan(params).promise()

        res.status(200).send({records: scanResult.Items})
    } catch (error) {
        console.log('Some error occured while fetching', error)
        res.status(500).send(error);
    }
});

// Endpoint to upload the file
app.post("/upload", async (req, res) => {
  const file = req.files.file;

  // generating a data key from AWS KMS
  params = {
    KeyId: process.env.KMS_ARN, // ARN or KeyId of the CMK
    KeySpec: "AES_256", // type of data key to be returned
  };

  try {
    //returns plain and cipher text form of the data key
    const dataKey = await kms.generateDataKey(params).promise();
    try {
      // encrypting the file using the plain text version of the data key
      console.log('dataKey', dataKey)
      const encryptedBuffer = encrypt(file.data, dataKey.Plaintext);

      //making the plain text data key null
      for (let i = 0; i < dataKey.Plaintext.length; i++) {
        dataKey.Plaintext[i] = null;
      }

      // storing the encrypted file in S3
      params = {
        Bucket: process.env.BUCKET_NAME, // name of the bucket
        Body: encryptedBuffer,
        Key: file.name,
      };
      try {
        await s3.putObject(params).promise();
      } catch (error) {
        console.log("Some error occured while putting the object ", error);
        res.status("500");
      }
      // creating a record in dynamodb for file and encrypted data key
      params = {
        TableName: process.env.TABLE_NAME, // name of the table
        Item: {
          id: uuidv4(),
          encryptedDataKey: dataKey.CiphertextBlob,
          fileName: file.name,
        },
      };
      try {
        await dynamodb.put(params).promise();
      } catch (error) {
        console.log("Error occured while writing to dynamodb table ", error);
        res.status("500");
      }
    } catch (error) {
      console.log("Some error occured while encrypting ", error);
      res.status("500");
    }
  } catch (error) {
    console.log("Some error occured while generating a data key ", error);
    res.status("500");
  }

  res.status(200).send("Success");
});

// Endpoint to download the file
app.post("/download", async (req, res) => {
  const fileId = req.body.fileId;

  // Fetching the encrypted data key from dynamodb table
  params = {
    TableName: process.env.TABLE_NAME, // table name of dynamodb
    Key: {
      id: fileId,
    },
  };

  try {
    const record = await dynamodb.get(params).promise();

    //Fetching the file from S3
    params = {
      Bucket: process.env.BUCKET_NAME,
      Key: record.Item.fileName,
    };

    try {
      const s3Res = await s3.getObject(params).promise();

      // decrypting the encrypted dataKey
      params = {
        CiphertextBlob: record.Item.encryptedDataKey, //encrypted data key
        KeyId: process.env.KMS_ARN, // ARN or KeyId of the CMK
      };
      try {
        const decryptedDataKey = await kms.decrypt(params).promise();

        const decryptedBuffer = decrypt(s3Res.Body, decryptedDataKey.Plaintext);

        return res
          .status(200)
          .send({ file: decryptedBuffer, fileName: record.Item.fileName });
      } catch (error) {
        console.log("Error while decrypting the data key", error);
        return res.status(500)
      }
    } catch (error) {
      console.log("Error occured while retrieving the file", error);
      return res.status(500)
    }
  } catch (error) {
    console.log("Error fetching record from dynamodb ", error);
    return res.status(500)
  }
});

app.listen(8080, () => console.log("Server running on port 8080! "));
