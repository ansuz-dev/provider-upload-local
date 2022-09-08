'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const { pipeline } = require('stream');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const { PayloadTooLargeError } = require('@strapi/utils').errors;

const UPLOADS_FOLDER_NAME = 'uploads';

module.exports = {
  init({ sizeLimit = 1000000 } = {}) {
    const verifySize = file => {
      if (file.size > sizeLimit) {
        throw new PayloadTooLargeError();
      }
    };

    // Ensure uploads folder exists
    const uploadPath = path.resolve(strapi.dirs.static.public, UPLOADS_FOLDER_NAME);
    if (!fse.pathExistsSync(uploadPath)) {
      throw new Error(
        `The upload folder (${uploadPath}) doesn't exist or is not accessible. Please make sure it exists.`
      );
    }

    return {
      uploadStream(file, config) {
        verifySize(file);

        const regex = /::(?<sid>\w*)::/gu;
        const match = regex.exec(file.name);

        return new Promise((resolve, reject) => {
          let targetFile = path.join(uploadPath, `${file.hash}${file.ext}`);
          if (match?.groups?.sid) {
            const targetPath = path.join(uploadPath, match.groups.sid);
            fs.existsSync(targetPath) || fs.mkdirSync(targetPath, {recursive: true});
            targetFile = path.join(targetPath, `${file.hash}${file.ext}`);
          }

          pipeline(
            file.stream,
            fs.createWriteStream(targetFile),
            err => {
              if (err) {
                return reject(err);
              }

              file.url = match?.groups?.sid
                ? `/uploads/${match.groups.sid}/${file.hash}${file.ext}`
                : `/uploads/${file.hash}${file.ext}`;

              resolve();
            }
          );
        });
      },
      upload(file, config) {
        verifySize(file);

        const regex = /::(?<sid>\w*)::/gu;
        const match = regex.exec(file.name);

        return new Promise((resolve, reject) => {
          let targetFile = path.join(uploadPath, `${file.hash}${file.ext}`);
          if (match?.groups?.sid) {
            const targetPath = path.join(uploadPath, match.groups.sid);
            fs.existsSync(targetPath) || fs.mkdirSync(targetPath, {recursive: true});
            targetFile = path.join(targetPath, `${file.hash}${file.ext}`);
          }

          // write file in public/assets folder
          fs.writeFile(targetFile, file.buffer, err => {
            if (err) {
              return reject(err);
            }

            file.url = match?.groups?.sid
                ? `/uploads/${match.groups.sid}/${file.hash}${file.ext}`
                : `/uploads/${file.hash}${file.ext}`;

            resolve();
          });
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          const filePath = path.join(uploadPath, `${file.hash}${file.ext}`);

          if (!fs.existsSync(filePath)) {
            return resolve("File doesn't exist");
          }

          // remove file from public/assets folder
          fs.unlink(filePath, err => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      },
    };
  },
};
