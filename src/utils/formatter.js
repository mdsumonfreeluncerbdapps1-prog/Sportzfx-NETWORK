exports.formatMatches = (matches, page = 0) => {
  if (!matches || matches.length === 0) {
    return "No matches found\n0. Back";
  }

  const perPage = 3;
  const start = page * perPage;

  const list = matches.slice(start, start + perPage);

  let text = list.map((m, i) => {
    return `${i + 1}. ${m}`;
  }).join("\n");

  text += "\n\n9. Next\n0. Back";

  return text;
};
