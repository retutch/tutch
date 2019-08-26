

@{%
const lexer = require('./lex').lexer;
const util = require('./parse/parse');
%}

@lexer lexer

Proposition -> _ Prop _                                 {% x => x[1] %}

Term     -> "(" Term ")"                                {% util.TermParens %}
          | %ident (_ Term):*                           {% util.Term %} 

Prop     -> Prop0q                                      {% id %}
Type     -> "nat" {% util.Identifier %} 
          | %ident {% util.Identifier %}

PropUnop -> "~"                                         {% id %}
PropOp3  -> "&"                                         {% () => "&" %}
PropOp2  -> "|"                                         {% () => "|" %}
PropOp1  -> "=" ">"                                     {% () => "=>" %}
PropOp0  -> "<" "=" ">"                                 {% () => "<=>" %}

QuantOp  -> "!" {% id %} | "?" {% id %}

Prop5    -> "T"                                         {% util.PropTrue %}
          | "F"                                         {% util.PropFalse %}
          | %ident (_ Term):*                           {% util.Atom %}
          | "(" _ Prop _ ")"                            {% util.PropParens %}

Prop4    -> Prop5  {% id %} | PropUnop _ Prop4          {% util.UnaryProposition %}
Prop3    -> Prop4  {% id %} | Prop4 _ PropOp3 _ Prop3   {% util.BinaryProposition %}
Prop2    -> Prop3  {% id %} | Prop3 _ PropOp2 _ Prop2   {% util.BinaryProposition %}
Prop1    -> Prop2  {% id %} | Prop2 _ PropOp1 _ Prop1   {% util.BinaryProposition %}
Prop0    -> Prop1  {% id %} | Prop1 _ PropOp0 _ Prop1   {% util.BinaryProposition %}

Prop5q   -> Prop5  {% id %} | QuantOp _ %ident _ ":" _ Type _ "." _ Prop {% util.QuantifiedProposition %}

Prop4q   -> Prop5q {% id %} | PropUnop _ Prop4q         {% util.UnaryProposition %}
Prop3q   -> Prop4q {% id %} | Prop4 _ PropOp3 _ Prop3q  {% util.BinaryProposition %}
Prop2q   -> Prop3q {% id %} | Prop3 _ PropOp2 _ Prop2q  {% util.BinaryProposition %}
Prop1q   -> Prop2q {% id %} | Prop2 _ PropOp1 _ Prop1q  {% util.BinaryProposition %}
Prop0q   -> Prop1q {% id %} | Prop1 _ PropOp0 _ Prop1q  {% util.BinaryProposition %}

_ -> (%space | %comment | %comment_start | %comment_end | %linecomment):*
                                                     {% util.WS %}