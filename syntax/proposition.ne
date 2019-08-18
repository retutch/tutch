

@{%
const lexer = require('./lex').lexer;
const util = require('./parse/parse');
%}

@lexer lexer

Proposition -> _ Prop _                              {% x => x[1] %}

Prop     -> Prop0                                    {% id %}

PropUnop -> "~"                                      {% id %}
PropOp3  -> "&"                                      {% () => "&" %}
PropOp2  -> "|"                                      {% () => "|" %}
PropOp1  -> "=" ">"                                  {% () => "=>" %}
PropOp0  -> "<" "=" ">"                              {% () => "<=>" %}

Prop5    -> "T"                                      {% util.PropTrue %}
          | "F"                                      {% util.PropFalse %}
          | %ident                                   {% util.Identifier %}
          | "(" _ Prop _ ")"                         {% util.PropParens %}
Prop4    -> Prop5 {% id %} | PropUnop _ Prop4        {% util.UnaryProposition %}
Prop3    -> Prop4 {% id %} | Prop4 _ PropOp3 _ Prop3 {% util.BinaryProposition %}
Prop2    -> Prop3 {% id %} | Prop3 _ PropOp2 _ Prop2 {% util.BinaryProposition %}
Prop1    -> Prop2 {% id %} | Prop2 _ PropOp1 _ Prop1 {% util.BinaryProposition %}
Prop0    -> Prop1 {% id %} | Prop1 _ PropOp0 _ Prop1 {% util.BinaryProposition %}

_ -> (%space | %comment | %comment_start | %comment_end | %linecomment):*
                                                     {% util.WS %}