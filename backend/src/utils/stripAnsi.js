function stripAnsi(input) {
  const pattern =
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  return input.replace(pattern, "");
}
module.exports = { stripAnsi };
