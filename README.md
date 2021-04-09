# Envelope Encryption using AWS KMS

This is a demo application for implementing envelope encryption using AWS KMS.

### Prerequisites
- Create a S3 bucket
- Create a CMK in KMS
- Create a DynamoDB table

### Steps to run the application locally
- Run `npm install` in the root and backend folder to install all the dependencies
- Create a `.env` file in the backend folder and write below values:\
    `KMS_ARN` arn of CMK\
    `BUCKET_NAME` bucket name\
    `TABLE_NAME` dynamoDB table name\
    
- Run `cd backend` in root folder and then `npm start`
- Run `npm start` in the root folder

