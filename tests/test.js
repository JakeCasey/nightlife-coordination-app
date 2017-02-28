require('dotenv').load();
//env ID=396907560644762 SECRET=b095170f5dfdd26f5a03c123bf7be69a PASSPORTSECRET=qpwoeiruty DB_HOST=mongodb://localhost mocha


var chai = require ('chai')
var chaiHttp = require('chai-http');
var server = require('../index.js');
chai.use(chaiHttp);
var mongoose = require('mongoose');
var Bar = require('../models/Bars');
mongoose.set('debug', true);

var should = chai.should();
var request = chai.request

//connect to server and get a 200 status response.
describe('server', function(){
   it('should give res of 200', function(done){
       request(server)
        .get('/')
        .end(function(err, res){
            if(err){return err;}
            res.should.have.status(200);
            done();
        })
   })
    
});

//this is broken for now.

// describe('search', function(){
//   it('should search for a city', function(done){
        
//       request(server)
//         .post('/search')
//         .set('content-type', 'application/x-www-form-urlencoded')
//         .send( { city : 'appleton'})
//         .end(function(err, res, body){
//           console.log(body);
//             if(err){return err}
//             should.exist(res);
//         })
       
//   }) 
// });


//tests for database interactions.
describe('database', function(){
    beforeEach(function(done){
            Bar.collection.drop();
            
            var newBar = new Bar({
                yelpID: 'a-bar-in-appleton', 
                name: 'A Bar',
                people: 0,
                users: [],
                snippetText: 'this place is awesome.'
                
            })
            
            newBar.save(function(err){
                if (err){return err;};
                done();
                
            })
        })
        
    afterEach(function(done){
            Bar.collection.drop(done());
        })
    
    
    it('should find a document.', function(done){
        
        Bar.findOne({yelpID : 'a-bar-in-appleton'}, function(err, bar){
            if(err){return err};
            
            should.exist(bar);
            bar.should.be.an('object');
            done();
        })
    
    });
    
    it('should add a userID to a document.', function(done){
       Bar.findOne({yelpID : 'a-bar-in-appleton'}, function(err, bar){
            if(err) {return err;}
            bar.addUser('12345');
            bar.users.should.have.length(1);
            done();
           })
    });
    
    
    
    it('a document with people property should be incremented', function(done){
        
      Bar.findOne({yelpID : 'a-bar-in-appleton'}, function(err, bar){
            if(err){return err};
            
            bar.increment();
            done();
            bar.save(function(err){
                if (err){return err};
                
                Bar.findOne({yelpID : bar.yelpID}, function(err, bar){
                  if(err){return done(err)}
                  bar.people.should.equal(1);
                  
                    
                });
            })
            
            
        })
        
    });
    
    it('should increment a bar when the increment id path is went to', function(done){
        //find bar id for http request
        Bar.findOne({yelpID : 'a-bar-in-appleton'}, function(err, bar) {
            
            if(err){return err};
            
            request(server)
            .get('/going/' + bar._id)
            .end(function(err, res){
                if(err){return err;}
                
                Bar.findOne({_id : bar._id}, function(err, bar) {
                    if(err) {return err;}
                    bar.people.should.equal(1);
                    done();
                    
                });
            });
        })
    });
    
    it('should sort an array of objects based on the name in the database', function(){
        
        var bars = [];
        
        var a = {
                yelpID: 'a-bar-in-appleton', 
                name: 'A Bar',
                people: 0,
                users: [],
                snippetText: 'this place is awesome.'
            }
            
        var b = {
                yelpID: 'a-bar-in-appleton', 
                name: 'B Bar',
                people: 0,
                users: [],
                snippetText: 'this place is awesome.'
            
        }
        
        bars.push(b)
        bars.push(a);
        
        
      var sorted = bars.sort(function(a,b){
        var  nameA = a.name.toUpperCase();
        var nameB = b.name.toUpperCase();
          
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          
          return 0;
         
        });
        
        var sortedArr = [
            {
                yelpID: 'a-bar-in-appleton', 
                name: 'A Bar',
                people: 0,
                users: [],
                snippetText: 'this place is awesome.'
            },
            {
                yelpID: 'a-bar-in-appleton', 
                name: 'B Bar',
                people: 0,
                users: [],
                snippetText: 'this place is awesome.'
            
            }
                        ]    
        
        sorted.should.deep.equal(sortedArr);
        
        
    
        
        
        
    });
    
    it('should decrement a bar when the decrement id path is requested', function(done){
        //find bar id for http request
        Bar.findOne({yelpID : 'a-bar-in-appleton'}, function(err, bar) {
            
            if(err){return err};
            
            request(server)
            .get('/notgoing/' + bar._id)
            .end(function(err, res){
                if(err){return err;}
                
                Bar.findOne({_id : bar._id}, function(err, bar) {
                    if(err) {return err;}
                    bar.people.should.equal(-1);
                    done();
                    
                });
            });
        })
    });
    
    
    
})