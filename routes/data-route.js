const express = require('express')
const route = express.Router()
const Sequelize = require("sequelize");
const fs = require('fs');
const path = require('path')

const sequelize = new Sequelize(
   's539_countdownsmp',
   'u539_lZc6mW8ihF',
   '0NSPnwEN!8gan!9B41a.2FiP',
   {
      host: '194.233.84.178',
      dialect: 'mysql'
   }
);

const local = '/tmp/users.json'

const GoogleCloudStorage = require('@google-cloud/storage');
  
// const GOOGLE_CLOUD_PROJECT_ID = 'countdownsmp'; // Replace with your project ID
// const GOOGLE_CLOUD_KEYFILE = 'path-to-the-private-key'; // Replace with the path to the downloaded private key

// const storage = GoogleCloudStorage({
//   projectId: GOOGLE_CLOUD_PROJECT_ID,
//   keyFilename: GOOGLE_CLOUD_KEYFILE,
// });

// The ID of your GCS bucket
// const bucketName = 'your-unique-bucket-name';

// The path to your file to upload
// const filePath = 'path/to/your/file';

// The new ID for your GCS file
// const destFileName = 'your-new-file-name';

// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

// Creates a client
const storage = new Storage();

async function uploadFile(filePath, generationMatchPrecondition) {

   const bucketName = 'gs://countdownsmp.appspot.com'
   const options = {
      destination: 'users.json',
      // Optional:
      // Set a generation-match precondition to avoid potential race conditions
      // and data corruptions. The request to upload is aborted if the object's
      // generation number does not match your precondition. For a destination
      // object that does not yet exist, set the ifGenerationMatch precondition to 0
      // If the destination object already exists in your bucket, set instead a
      // generation-match precondition using its generation number.
      preconditionOpts: {ifGenerationMatch: generationMatchPrecondition},
   };

  await storage.bucket(bucketName).upload(filePath, options);
  console.log(`${filePath} uploaded to ${bucketName}`);
}

async function downloadFile() {

   const bucketName = 'countdownsmp.appspot.com'
   const fileName = 'users.json'
   const destFileName = path.join(path.join(__dirname, '../tmp'), 'users.json')
   const options = {
      destination: destFileName,
   };
 
   // Downloads the file
   await storage.bucket(bucketName).file(fileName).download(options);
 
   console.log(
     `gs://${bucketName}/${fileName} downloaded to ${destFileName}.`
   );
}

route.get('/', (req, res) => {
   
   sequelize.query(
      'SELECT * FROM countdownsmp_user',
      {
         type: sequelize.QueryTypes.SELECT
      }
   ).then(result => {

      console.log(result.length)

      let dataUsers = result.map(data => {
         return {
            "uuid": data.uuid,
            "name": data.name,
            "ytChannel": ""
         }
      })

      // let path = local

      console.log('Reading File');
      var archivo = storage.bucket('countdownsmp.appspot.com').file('users.json').createReadStream();
      console.log('Concat Data');
      var buf = '';

      try {
         archivo.on('data', function(d) {
            buf += d;
         })
         .on('error', function() {
            console.log('File does not exists!')

            console.log('Setting up to create file...')
            fs.writeFile(local, JSON.stringify(dataUsers, null, 4), function(errs, data) {
               if(errs) throw errs
               
               console.log('Uploading to GCS Bucket')
               uploadFile(local, 0).catch(console.error);

               res.send({
                  result,
                  obj: dataUsers
               })
            })
         })
         .on('end', function() {

            buf = JSON.parse(buf)

            // Check if there is new data from mysql
            if(dataUsers.length > buf.length) {
               let list_new_entry = arr_diff(remove_duplicates(dataUsers.map(data => data.name)), remove_duplicates(buf.map(data => data.name)))

               for(var i in dataUsers) {
                  for(var j in list_new_entry) {
                     if(dataUsers[i].name === list_new_entry[j]) {
                        buf.push(dataUsers[i])
                     }
                  }
               }

               console.log('New entry(s) is found!')

               fs.writeFile(local, JSON.stringify(buf, null, 4), function(errs, data) {
                  if(errs) throw errs
                  
                  console.log('Uploading to GCS Bucket')
                  uploadFile(local).catch(console.error);
               })
            }

            if(dataUsers.length < buf.length) {
               let entity_missing = arr_diff(buf.map(data => data.name), remove_duplicates(dataUsers.map(data => data.name)))

               for(var j in entity_missing) {
                  buf.pop(buf[entity_missing[j]])
               }

               console.log('Entities decreased!')
               console.log('Rewriting JSON data...')

               fs.writeFile(local, JSON.stringify(buf, null, 4), function(errs, data) {
                  if(errs) throw errs
                  
                  console.log('Uploading to GCS Bucket')
                  uploadFile(local).catch(console.error);
               })
            }

            console.log("End");
            res.send({
               result,
               obj: buf
            });
         })   
      } catch (err) {
         console.log(err)
      }
      // if (fs.existsSync(path)) {

      //    console.log('exists!')
      //    //file exists
      //    var obj = JSON.parse(fs.readFileSync('./static/users.json', 'utf8'));

      //    if(obj.length !== dataUsers.length) {

      //       let list_new_entry = arr_diff(remove_duplicates(dataUsers.map(data => data.name)), remove_duplicates(obj.map(data => data.name)))

      //       for(var i in dataUsers) {
      //          for(var j in list_new_entry) {
      //             if(dataUsers[i].name === list_new_entry[j]) {
      //                obj.push(dataUsers[i])
      //             }
      //          }
      //       }

      //       fs.writeFile ("./static/users.json", JSON.stringify(obj, null, 4), function(err) {
      //          console.log('complete');
      //       });
      //    }

      //    res.send({
      //       result,
      //       obj
      //    })
      //  } else {
      //    fs.writeFile(local, JSON.stringify(dataUsers, null, 4), function(errs, data) {
      //       if(errs) throw errs
            
      //       uploadFile(local).catch(console.error);
      //    })

      //    let obj = dataUsers

      //    obj.map(data => {
      //       data.ytChannel = ''
      //    })

      //    res.send({
      //       result,
      //       obj
      //    })
      //  }
   }).catch((error) => {
      console.error('Failed to insert data : ', error);
   });
})

route.put('/update', (req, res) => {

   const {name ,ytChannel} = req.body

   console.log('Reading File');
   var archivo = storage.bucket('countdownsmp.appspot.com').file('users.json').createReadStream();
   console.log('Concat Data');
   var buf = '';

   try {
      archivo.on('data', function(d) {
         buf += d;
      })
      .on('error', function() {
         console.log('File does not exists!')
      })
      .on('end', function() {
         let obj = JSON.parse(buf)
         console.log("End");

         obj.forEach(function(user) {
            if(user.name === name) {
               user.ytChannel = ytChannel
            }
         })

         fs.writeFile(local, JSON.stringify(obj, null, 4), function(errs, data) {
            if(errs) throw errs
            
            console.log('Uploading to GCS Bucket')
            uploadFile(local).catch(console.error);

            res.send({message: 'Success updating!'})
         })
      })   
   } catch (err) {
      console.log(err)
   }
})

route.delete('/delete')

module.exports = route

function arr_diff (a1, a2) {

   var a = [], diff = [];

   for (var i = 0; i < a1.length; i++) {
       a[a1[i]] = true;
   }

   for (var i = 0; i < a2.length; i++) {
       if (a[a2[i]]) {
           delete a[a2[i]];
       } else {
           a[a2[i]] = true;
       }
   }

   for (var k in a) {
       diff.push(k);
   }

   return diff;
}

function remove_duplicates(arr) {
   var obj = {};
   var ret_arr = [];
   for (var i = 0; i < arr.length; i++) {
       obj[arr[i]] = true;
   }
   for (var key in obj) {
       ret_arr.push(key);
   }
   return ret_arr;
}