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

if (Meteor.isServer){
    var require = Npm.require;
    var imap = require('imap');

    Meteor.startup(function fetch(){
        mailConnection = new imap.ImapConnection({
            username: 'kokomut123',
            password: 'deliciousdelicious',
            host: 'imap.gmail.com',
            port: 993,
            secure: true
        });
        mailConnection.connect(function(err){
            if (err){ console.log(err); }
            else {
                mailConnection.openBox('INBOX', false, function(err, mailbox){
                    if (err) { console.log(err); }
                    mailConnection.on('mail', function(){
                        console.log("NEW MAIL");
                    });
                    mailConnection.search(['UNSEEN'], function(err, results){
                        if (err) { console.log(err); }
                        try {
                            var fetch = mailConnection.fetch(results, {
                                request: {
                                             headers: ['from', 'to', 'subject'],
                                             body: true
                                         },
                                markSeen: true
                            });
                            fetch.on('message' function(msg){
                                var body = "";
                                msg.on("data", function(chunk){
                                    body += chunk.toString("utf8");
                                });
                                msg.on("end", function(){
                                    Fiber(function(){
                                        Messages.insert({
                                            "author": msg.headers.from[0],
                                            "subject": msg.headers.subject[0],
                                            "body": body,
                                            "timestamp": new Date().getTime()
                                        });
                                    }).run();
                                });
                            });
                            fetch.on('end', function(){
                                console.log("fetch done");
                                mailConnection.logout();
                            });
                        } catch(e){
                            mailConnection.logout();
                            return;
                        }
                    });
                });
            }
        });
    });

}
