var Messages = new Meteor.Collection("messages");

if (Meteor.isClient) {
    Accounts.ui.config({
        requestPermissions: { google: ["https://www.googleapis.com/auth/userinfo.email"] }
    });

    Template.hello.isLoggedIn = function(){
        return Meteor.userId() !== undefined;
    }

    Template.messageCards.messages = function(){
        msgs = Messages.find({}, {sort: {"timestamp" : -1}});
        console.log(msgs);

        return msgs;
    };

}

Meteor.methods({
    addEmail: function(from, subject, body){
                  //pull in regexes here, structure the body
                  Messages.insert({
                  "from": from,
                  "subject": subject,
                  "body": Meteor.call("processBody", body),
                  "timestamp": new Date().getTime()
                  });
              },

    processBody: function(body){
                     var bodyProcessed = body.replace(/--[0-9a-f]{28}--/g, '');
                     var bodyProcessed = body.replace(/--[0-9a-f]{28}/g, '');
                     var bodyHTMLStart = bodyProcessed.indexOf('text/html;', '');
                     var bodyHTMLString = bodyProcessed.substring(bodyHTMLStart + 25);
                     var bodyTextString = bodyProcessed.substring(0, bodyHTMLStart - 14);
                     var bodyObj = {};
                     bodyObj.text = bodyTextString;
                     bodyObj.html = bodyHTMLString;
                     console.log(bodyObj);
                     return bodyObj;
                }
});

function show(obj){
    return inspect(obj, false, Infinity);
}

if (Meteor.isServer){
    var require = Npm.require;
    var Fiber = require('fibers');
    var imap = require('imap');
    var MailParser = require('mailparser').MailParser;
    var mailparser = new MailParser();

    Meteor.startup(function fetch(){
        mailConnection = new imap.ImapConnection({
            username: 'kokomut123@gmail.com',
            password: 'deliciousdelicious',
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
        });

        mailparser.on("end", function(mail_object){
            console.log(mail_object);
            Fiber(function(){
                Meteor.call("addEmail", mail_object.headers.from, mail_object.headers.subject, mail_object.text);
            }).run();
        });

        mailConnection.connect(function(err){
            console.log("begin mail connection");
            if (err){ console.log(err); }
            else {
                mailConnection.openBox('INBOX', false, function(err, mailbox){
                    console.log("opening box... ");
                    if (err) { console.log(err); }
                    mailConnection.on('mail', function(){
                        console.log("NEW MAIL");
                    });
                    mailConnection.search(['UNSEEN', ['SINCE', 'June 10, 2013']], function(err, results){
                        console.log("starting unseen message search...");
                        if (err) { console.log(err); }
                        try{
                        mailConnection.fetch(results, {
                            headers: ['from', 'to', 'subject'],
                            body: true,
                            cb: function(fetch){
                                fetch.on('message', function(msg){
                                    console.log("got a message");
                                    var body = "";
                                    msg.on("data", function(chunk){
                                        body += chunk.toString();
                                    });
                                    msg.on("end", function(){
                                        var email = msg[']'];
                                        email = email + body;
                                        mailparser.write(email);
                                        mailparser.end();
                                    });
                                });
                            }
                        }, function(err){
                            if (err) throw err;
                            console.log("done with all messages");
                            mailConnection.logout();
                        });
                        } catch(e)
                        {
                            console.log(e);
                            mailConnection.logout();
                        }
                    });
                    mailConnection.search(['UNSEEN', ['SINCE', 'June 10, 2013']], function(err, results){
                        console.log("adding seen flag to messages...");
                        if (err) { console.log(err); }
                        mailConnection.addFlags(results, 'SEEN', function(err){
                            if (err) throw err;
                            console.log("done with adding flag to messages");
                            mailConnection.logout();
                        });
                    });
                });
            }
        });
    });

}
