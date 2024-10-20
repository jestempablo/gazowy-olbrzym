const fs = require("fs");

const totalPoints = 4000;
const valueSame = 10;
const valueDiff = 20;
const diffIndices = [1000, 2000, 3000]; // Indices where the value differs

const writeStream = fs.createWriteStream("test_data.csv");

for (let i = 0; i < totalPoints; i++) {
  const value = diffIndices.includes(i) ? valueDiff : valueSame;
  writeStream.write(`${i},${value}\n`);
}

writeStream.end();
