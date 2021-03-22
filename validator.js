const v = require('node-input-validator');

module.exports = function(RED) {
    "use strict";

    function Validator(n) {
      RED.nodes.createNode(this,n)           
      this.rules = n.rules || [];
      this.property = n.property;
      this.propertyType = n.propertyType || "msg";
      this.schema = n.schema;
      this.schemaType = n.schemaType || "global";
      this.customMessage = {};
      this.ruleObject = {};

      if (this.propertyType === 'jsonata') {
          try {
              this.property = RED.util.prepareJSONataExpression(this.property,this);
          } catch(err) {
              this.error(RED._("switch.errors.invalid-expr",{error:err.message}));
              return;
          }
      }

      var node = this
      if (this.schema !== ""){
        this.ruleObject = RED.util.evaluateNodeProperty(this.schema,this.schemaType,this,msg); 
    } else {
        for (var i=0; i<this.rules.length; i+=1) {
            var rule = this.rules[i];   
            //console.log(rule.v);    
            if(typeof(this.ruleObject[rule.field]) === "undefined"){
                this.ruleObject[rule.field] = rule.rule;
            }else{
                this.ruleObject[rule.field] = this.ruleObject[rule.field] + "|" + rule.rule;
            }   
            
            if(typeof(rule.value) !== "undefined"){
                this.ruleObject[rule.field] = this.ruleObject[rule.field] + ":" + rule.value;
            }  
            if ((typeof(rule.message) !== "undefined") && (rule.message !== "")){
                this.customMessage[rule.field] = rule.message;
            }
            
        }
    }
             

  
      node.on('input', function(msg) {   

        var jsonObject = RED.util.evaluateNodeProperty(this.property,this.propertyType,this,msg);  
        if (typeof jsonObject !== 'object') {
            msg.error = 'Ivalid json object.';
            node.send([msg,null]);
        }
       
        
        var cm = this.customMessage;    

        let validator = new v(jsonObject, this.ruleObject);        

        validator.check().then(function (matched) {
            if (matched) {
                node.send([null, msg]);
            } else {

                var customErrors=[];
                var customError = {};
                for (var er in validator.errors){
                    var customError =  {"source": { "pointer": '/data/attributes/' + er },
                    "title":  "Invalid Attribute"
                    };
                    if ((typeof(cm[er]) !== "undefined") && cm[er] !== ""){
                        validator.errors[er].message = cm[er];
                        customError.detail = cm[er];
                       
                    } else {
                        customError.detail = validator.errors[er].message;
                    }
                    customErrors.push(customError);
                }

                msg.error = validator.errors;
                msg.payload = customErrors[0];
                node.send([msg,null]);
            }
            
            //node.send(msg)
        });

      })
    }
    RED.nodes.registerType("validator", Validator)
  }