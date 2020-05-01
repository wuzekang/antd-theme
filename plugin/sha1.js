const { createHash } = require('crypto');

const encrypt = (algorithm, content) => {
  const hash = createHash(algorithm);
  hash.update(content);
  return hash.digest('hex');
};

const sha1 = (content) => encrypt('sha1', content);

module.exports = sha1;
