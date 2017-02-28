var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BarSchema = new Schema({
    
        yelpID: String, 
        name: String,
        people: Number,
        users: [],
        snippetText: String
    
})

BarSchema.methods.increment = function() {
        
        this.people++ 
        this.save(function(err){
                if (err){return err;}
        });
}

BarSchema.methods.decrement = function() {
        
        this.people-- 
        this.save(function(err){
                if (err){return err;}
        });
}

BarSchema.methods.addUser = function(userID){
        
        this.users.push(userID);
        this.save(function(err){
                if(err){return err;}
        })
        
}

BarSchema.methods.removeUser = function(userID){
        
        var index = this.users.indexOf(userID);
        this.users.splice(index, 1);
        
}

var Bar = mongoose.model('Bar', BarSchema);

module.exports = Bar;