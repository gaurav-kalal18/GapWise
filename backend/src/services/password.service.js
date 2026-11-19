
"use strict";

const {
  randomBytes,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");

const { promisify } = require("node:util");

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 256
  ) {
    throw new Error(
      "Password must contain 12–128 characters (maximum 256 UTF-8 bytes)."
    );
  }
}

async function hashPassword(password) {
  validatePassword(password);

  const salt = randomBytes(SALT_BYTES);

  const derivedKey = await scryptAsync(
    password,
    salt,
    KEY_BYTES,
    SCRYPT_OPTIONS
  );

  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  if (
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > 256 ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  const parts = storedHash.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [algorithm, n, r, p, saltHex, keyHex] = parts;

  if (
    n !== String(SCRYPT_OPTIONS.N) ||
    r !== String(SCRYPT_OPTIONS.r) ||
    p !== String(SCRYPT_OPTIONS.p) ||
    !/^[a-f0-9]{32}$/i.test(saltHex) ||
    !/^[a-f0-9]{128}$/i.test(keyHex)
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");

  const derivedKey = await scryptAsync(
    password,
    salt,
    KEY_BYTES,
    SCRYPT_OPTIONS
  );

  return timingSafeEqual(derivedKey, storedKey);
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePassword,
};
