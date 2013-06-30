var Messages = new Meteor.Collection("messages");

if (Meteor.isClient) {
    Accounts.ui.config({
        requestPermissions: { google: ["https://www.googleapis.com/auth/userinfo.email"] }
    });

    Template.hello.isLoggedIn = function(){
        return Meteor.userId() !== undefined;
    }

    Template.hello.greeting = function(){
        if (Meteor.user()){
            return "Welcome to meteordesk, " + Meteor.user().profile.name + ".";
        }
    };

    Template.messageList.messages = function(){
        return Messages.find({}, {sort: {"timestamp" : -1}});
    };

}

Meteor.methods({
    addEmail: function(seqno, uid, author, subject, body){
                  Messages.insert({
                  "msgno": seqno,
                  "uid": uid,
                  "author": author,
                  "subject": subject,
                  "body": body,
                  "timestamp": new Date().getTime()
                  });
              }
});

function show(obj){
    return inspect(obj, false, Infinity);
}

if (Meteor.isServer){
    var require = Npm.require;
    var imap = require('imap');
    var Fiber = require('fibers');

    Meteor.startup(function fetch(){
        mailConnection = new imap.ImapConnection({
            username: 'kokomut123@gmail.com',
            password: 'deliciousdelicious',
            host: 'imap.gmail.com',
            port: 993,
            secure: true
        });
        mailConnection.connect(function(err){
            console.log("begin mail connection");
            if (err){ console.log(err); }
            else {
                mailConnection.openBox('INBOX', true, function(err, mailbox){
                    console.log("opening box... ");
                    if (err) { console.log(err); }
                    mailConnection.on('mail', function(){
                        console.log("NEW MAIL");
                    });
                    mailConnection.search(['UNSEEN', ['SINCE', 'June 10, 2013']], function(err, results){
                        console.log("starting unseen message search...");
                        if (err) { console.log(err); }
                        mailConnection.fetch(results, {
                            headers: ['from', 'to', 'subject'],
                            body: true,
                            cb: function(fetch){
                                fetch.on('message', function(msg){
                                    console.log("got a message");
                                    var body = "";
                                    msg.on("data", function(chunk){
                                        body += chunk.toString('utf8');
                                    });
                                    msg.on("end", function(){
                                        console.log(msg);
                                        var email = msg[']'];
                                        var authPos = email.search("\n");
                                        var subject = email.substr(9, authPos - 9);
                                        email = email.substr(authPos + 1);
                                        var toPos = email.search("\n");
                                        var author = email.substr(6, toPos - 6);
                                        Fiber(function(){
                                            Meteor.call("addEmail", msg.seqno, msg.uid, author, subject, body);
                                        }).run();
                                    });
                                });
                            }
                        }, function(err){
                            if (err) throw err;
                            console.log("done with all messages");
                            mailConnection.logout();
                        });
                    });
                });
            }
        });
    });

}
