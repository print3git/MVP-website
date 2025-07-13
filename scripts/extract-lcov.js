function extractLcov(output) {
  const start = output.indexOf("TN:");
  if (start === -1) {
    throw new Error("Failed to parse LCOV from jest output");
  }
  output = output.slice(start);
  const endMarker = "end_of_record";
  const endIndex = output.lastIndexOf(endMarker);
  if (endIndex === -1) {
    throw new Error("Failed to parse LCOV from jest output");
  }
  const afterEnd = output.indexOf("\n", endIndex);
  if (afterEnd !== -1) {
    output = output.slice(0, afterEnd + 1);
  } else {
    output = output.slice(0, endIndex + endMarker.length);
  }
  return output;
}

module.exports = extractLcov;
