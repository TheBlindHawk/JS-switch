{
  // ヘルパー関数
  function joinCases(values) {
    return values.map(v => `case ${v}:`).join('');
  }
}

start = switch

switch = 
  "switch" _ "(" _ value:switchValue _ ")" _ "{" _
    cases:case*
    final:default?
  _ "}"
{ 
  return `switch(${value}){${cases.join('')}${final || ''}}`;
}

case = 
  _ values:caseValues fallthrough:":>"? _ body:caseBody _
{ 
  const caseStatements = joinCases(values);
  const breakStatement = fallthrough ? '' : 'break;';
  return `${caseStatements}${body}${breakStatement}`;
}

caseValues = 
  first:caseValue rest:(_ "," _ v:caseValue { return v })* _ ":"
{ 
  return [first, ...rest];
}

caseValue = 
  string / number / identifier

default = 
  "default" _ ":" _ body:caseBody
{ 
  return `default:${body}`;
}

caseBody = 
  block / singleStatement

block = 
  "{" body:blockContent "}"
{ 
  return `{${body}}`;
}

blockContent = 
  chars:blockChar*
{ 
  return chars.join('');
}

blockChar = 
  block / [^{}] { return text(); }

singleStatement = 
  chars:statementChar+
{ 
  return chars.join('').trim();
}

statementChar = 
  ![\n\r] char:. { return char; }

switchValue = 
  memberAccess / identifier

memberAccess = 
  obj:identifier "." prop:identifier
{ 
  return `${obj}.${prop}`;
}

identifier = 
  first:[a-zA-Z_$] rest:[a-zA-Z0-9_$]*
{ 
  return first + rest.join('');
}

string = 
  doubleQuotedString / singleQuotedString / templateString

doubleQuotedString = 
  '"' chars:doubleStringChar* '"'
{ 
  return `"${chars.join('')}"`;
}

doubleStringChar = 
  '\\"' { return '\\"'; } / [^"]

singleQuotedString = 
  "'" chars:singleStringChar* "'"
{ 
  return `'${chars.join('')}'`;
}

singleStringChar = 
  "\\'" { return "\\'"; } / [^']

templateString = 
  "`" chars:templateChar* "`"
{ 
  return `\`${chars.join('')}\``;
}

templateChar = 
  "\\`" { return "\\`"; } / [^`]

number = 
  "-"? digits:[0-9]+ ("." [0-9]+)?
{ 
  return text();
}

_ "whitespace" = 
  [ \t\n\r]*

__ "required whitespace" = 
  [ \t\n\r]+