const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export function generateMockIpfsHash(): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  let result = "bafy";
  random.forEach((value) => {
    result += alphabet[value % alphabet.length];
  });
  return result;
}
