export function int(val) {
  return parseInt(val, 10) || 0;
}

export const generateRuleSentence = (conditions, decision) => {
  const translatedConditions = conditions.map(cond => {
    let textOp = "";
    switch (cond.op) {
      case "=": textOp = "wynosi"; break;
      case "<=": textOp = "nie przekracza"; break;
      case ">": textOp = "jest większe niż"; break;
      case "IN": textOp = "przyjmuje jedną z wartości"; break;
      case "∈": textOp = "mieści się w przedziale"; break;
      default: textOp = cond.op;
    }
    return `atrybut [${cond.attribute}] ${textOp} ${cond.val}`;
  });
  return `Jeśli ${translatedConditions.join(' oraz ')}, to system przewiduje klasę: "${decision}".`;
};