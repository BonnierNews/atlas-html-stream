const { describe, it } = require("mocha")
const { expect } = require("chai")
const { Transform } = require("stream");
const HtmlParser = require("../src/HtmlParser");
const { parse, theyBoth } = require("./helpers");

describe("HtmlParser", function(){
  it("should create an instance of a stream Transform", function(){
    const parser = new HtmlParser();
    expect(parser).to.be.an.instanceOf(Transform)
  })
  describe("ignores trivial html files", function(done){
    it("should not capture any tokens from empty files", function(done){
      parse({name: "empty.html"}, (err, res) => {
        if (err) return done(err);
        expect(res.length).to.equal(0);
        done();
      })
    })
    theyBoth("should not capture any tokens from pure whitespace files", "empty-ws", function(res, done){
      expect(res.length).to.equal(0);
      done();
    })
  })
  describe("captures text nodes", function(){
    theyBoth("should collapse whitespace in raw text", "text", function(res, done){
      expect(res.length).to.equal(1);
      expect(res[0].text).to.equal("this is some text with lots of whitespace ...the end");
      done();
    })
    theyBoth("should capture nested text nodes", "text-nested", function(res, done){
      res = res.filter(d => "text" in d)
      expect(res.length).to.equal(5);
      res.forEach(({text}) => expect(text).to.equal("nowhitespace"));
      done()
    })
    theyBoth("should capture nested text nodes with whitespace", "text-nested-ws", function(res, done){
      res = res.filter(d => "text" in d)
      expect(res.length).to.equal(4);
      res.forEach(({text}) => expect(text).to.equal("some nested text"));
      done()
    })
  })
  describe("captures names of html nodes", function(){
    theyBoth("should capture names of open/close tags", "name", function(res, done){
      expect(res.length).to.equal(2);
      res.forEach(({name}) => expect(name).to.equal("some-name"))
      done()
    });
    theyBoth("should ignore malformatted space around names of open/close tags", "name-ws", function(res, done){
      expect(res.length).to.equal(2);
      res.forEach(({name}) => expect(name).to.equal("some-name"))
      done()
    })
    theyBoth("should capture open+close tag name for self-closing tag", "name-selfclosing", function(res, done){
      expect(res.length).to.equal(2);
      res.forEach(({name}) => expect(name).to.equal("some-name"))
      done();
    })
    theyBoth("should ignore malformatted space around names of self-closing tags", "name-selfclosing-ws", function(res, done){
      expect(res.length).to.equal(2);
      res.forEach(({name}) => expect(name).to.equal("some-name"))
      done();
    })
  })
  // this parser is not responsible for discerning `true` keys or other non-string literal keys
  // will leave as a burden for the caller.
  describe("captures attributes in html nodes", function(){
    theyBoth("should capture bare keys as an empty string", "key-bare", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({"some-key": ""});
      done();
    })
    theyBoth("should ignore malformatted whitespace around bare keys", "key-bare-ws", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({"some-key": ""});
      done();
    })
    theyBoth("should capture unquoted values as strings", "key-val", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({
        "some-key": "false",
        "another-key": "24",
        "a-key": "null"
      });
      done();
    })
    theyBoth("should ignore malformatted whitespace around unquoted values", "key-val-ws", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({
        "some-key": "false",
        "another-key": "24",
        "a-key": "null"
      });
      done();
    })
    theyBoth("should capture quoted values", "key-val-quotes", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({
        "some-key": "some double quoted value",
        "another-key": "some single quoted value"
      });
      done();
    })
    theyBoth("should ignore malformatted whitespace around quoted values", "key-val-quotes-ws", function(res, done){
      res = res.filter(d => d.data);
      expect(res.length).to.equal(1);
      expect(res[0].data).to.deep.equal({
        "some-key": "some double quoted value",
        "another-key": "some single quoted value"
      });
      done();
    })
  })
  describe("captures comment nodes", function(){
    theyBoth("should treat everything inside the node as raw text", "comment", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "!--", data: {}});
      expect(res[1].text).to.equal('this is a comment')
      expect(res[2]).to.deep.equal({name: "!--"})
      done();
    })
    theyBoth("should keep all whitespace inside the node", "comment-ws", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "!--", data: {}});
      expect(res[1].text).to.equal('\n  this\n  is\n  a\n  comment\n')
      expect(res[2]).to.deep.equal({name: "!--"})
      done();
    })
  })
  describe("captures script nodes", function(){
    theyBoth("should treat everything inside the node as raw text", "script", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "script", data: {}});
      expect(res[1].text).to.equal('const c = <Component key="value"/>; const x = "hello"')
      expect(res[2]).to.deep.equal({name: "script"})
      done();
    })
    theyBoth("should keep all whitespace inside the node", "script-ws", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "script", data: {}});
      expect(res[1].text).to.equal('\n  const c = <Component key="value"/>;\n  const x = "hello"\n')
      expect(res[2]).to.deep.equal({name: "script"})
      done();
    })
  })
  describe("captures style nodes", function(){
    theyBoth("should treat everything inside the node as raw text", "style", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "style", data: {}});
      expect(res[1].text).to.equal('h1 {color:red;} p {color:blue;} <oops this=is not=valid css="!"/>')
      expect(res[2]).to.deep.equal({name: "style"})
      done();
    })
    theyBoth("should keep all whitespace inside the node", "style-ws", function(res, done){
      expect(res.length).to.equal(3);
      expect(res[0]).to.deep.equal({name: "style", data: {}});
      expect(res[1].text).to.equal('\n  h1 {color:red;}\n  p {color:blue;}\n  <oops this=is not=valid css="!"/>\n')
      expect(res[2]).to.deep.equal({name: "style"})
      done();
    })
  })
  describe("correctly parses complete html files", function(){
    theyBoth("should capture all the nodes", "app", function(res, done){
      expect(res.length).to.equal(45)
      expect(res).to.deep.equal([
        {name: "!DOCTYPE", data: {html: ""}},
        {name: "html", data: {}},
        {name: "head", data: {}},
        {text: "some actual text"},
        {name: "!--", data: {}},
        {text: " broken link "},
        {name: "!--"},
        {name: "link", data: {rel: "stylesheet", type: "text/css", href: "mystyle.css"}},
        {name: "meta", data: {name: "viewport", content: "width=device-width, initial-scale=1"}},
        {name: "title", data: {}},
        {text: "My App"},
        {name: "title"},
        {name: "style", data: {}},
        {text: "\n      p {\n        margin: 0 auto;\n      }\n    "},
        {name: "style"},
        {name: "script", data: {}},
        {text: '\n      alert("Click me!")\n    '},
        {name: "script"},
        {name: "head"},
        {name: "body", data: {}},
        {name: "h1", data: {style: "color:blue;margin-left:30px;"}},
        {text: "My Awesome App"},
        {name: "h1"},
        {text: "This Is My Body"},
        {name: "p", data: {}},
        {text: "Paragraph 1"},
        {name: "p"},
        {name: "p", data: {these: ""}},
        {text: "Trees"},
        {name: "p", data: {are: "definitely"}},
        {text: "Are"},
        {name: "p", data: {invalid: ""}},
        {text: "Cool"},
        {name: "p", data: {attributes: "", on:"", our: "paragraph tags"}},
        {text: "Right?"},
        {name: "p"},
        {name: "p"},
        {name: "!--", data: {}},
        {text: " \n          hello \n          world \n        "},
        {name: "!--"},
        {text: "some actual text"},
        {name: "p"},
        {name: "p"},
        {name: "body"},
        {name: "html"}
      ])
      done()
    })
  })
})
