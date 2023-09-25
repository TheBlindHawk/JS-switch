switch = 
  "switch" _ "(" value:expression ")" _ "{" _ [\n]
    cases:case*
    final:default?
  "}"
{ return "switch(" + value + "){" + cases.join("") + final + "}" }

case = _ info:comparison breakless:">"? _ body:action
{ return info + body + (breakless ? ";" : ";break;") }

default = _ "default:"_ body:action
{ return "default:" + body + ";" }

action = action:expression/actions
{ return action }

actions = [\n] actions:expression+
{ return actions.join("") }

comparison = values:values* final:expression ":"
{ return values + "case " + final + ":" }

values = value:expression "," _ 
{ return "case " + value + ":" }

expression = expressions:([ \t\s]/[a-zA-Z0-9.]/brackets/commas)+ [\n|;]?
{ return expressions.join("") }
brackets = r_brackets/n_brackets
r_brackets = "(" e:expression ")" { return "(" + e + ")" }
n_brackets = "{" e:expression "}" { return "{" + e + "}" }
commas = single_commas/double_commas
single_commas = "'" e:expression "'" { return "'" + e + "'" }
double_commas = '"' e:expression '"' { return '"' + e + '"' }

_ = [ \t\s]*
__ = [ \t\s]+