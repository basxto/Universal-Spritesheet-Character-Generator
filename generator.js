//class for spritesheets
class Spritesheet {
    constructor(name, src, attributes = {}){
        this.name = name;
        this.src = src;
        this.layer = attributes['layer'];
        this.category = attributes['category'].split(';');
        this.sex = attributes['sex'];
        this.license = attributes['license'].split(';');
        this.url = attributes['url'];
    }
}

class Category {
    constructor(name) {
        this.name = name;
        this.subcategories = [];
        this.sprites = [];
    }

    hasCategory(name) {
        for (let i in this.subcategories)
            if (this.subcategories[i].name == name)
                return true;
        return false;
    }

    getCategory(name) {
        for (let i in this.subcategories)
            if (this.subcategories[i].name == name)
                return this.subcategories[i];
    }

    getCategories() {
        return this.subcategories;
    }

    addCategory(name) {
        this.subcategories.push(new Category(name));
    }

    hasSpriteset(name) {
        for (let i in this.sprites)
            if (this.sprites[i][0].name == name)
                return true;
        return false;
    }

    getSpriteset(name) {
        for (let i in this.sprites)
            if (this.sprites[i][0].name == name)
                return this.sprites[i];
    }

    getSpritesets() {
        return this.sprites;
    }

    addSpriteset(ss) {
        this.sprites.push(ss);
    }
}

class Author {

    constructor(name, url){
        this.name = name;
        this.url = url;
        this.sprites = []
    }

    addSprite(ss){
        this.sprites.push(ss);
    }
}

class LpcGenerator {
    constructor(){
        this.categories = new Category('all');
        this.animations = [];
        this.spritesheets = [];
        this.authors = {};
    }

    drawSprite(parent, spriteset){
        let li = document.createElement("li");
        let input = document.createElement("input");
        input.name = spriteset[0].name;
        input.type = "radio"
        let label = document.createElement("label");
        label.appendChild(document.createTextNode(spriteset[0].name));
        li.appendChild(input);
        li.appendChild(label);
        parent.appendChild(li);
    }

    //generate html list for category recursively
    drawCategory(parent, category){
        let li = document.createElement("li");
        let ul = document.createElement("ul");
        ul.style = "display:block;"
        let span = document.createElement("span");
        span.appendChild(document.createTextNode(category.name));
        span.className = "expanded";
        li.appendChild(span);
        li.appendChild(ul);
        parent.appendChild(li);
        let children = category.getCategories();
        for (let i in children) {
            this.drawCategory(ul, children[i])
        }
        let sprites = category.getSpritesets();
        for (let i in sprites) {
            this.drawSprite(ul, sprites[i])
        }
    }

    updateGui(){
        let mainList = document.getElementById('chooser').getElementsByTagName('ul')[0];
        //remove all children but those in the 'keep' class
        while (mainList.lastChild && (!mainList.lastChild.className || !mainList.lastChild.className.match(/.*keep.*/) )) {
            mainList.removeChild(mainList.lastChild)
        }
        let mainCategories = this.categories.getCategories();
        for (let i in mainCategories) {
            this.drawCategory(mainList, mainCategories[i])
        }

    }

    //load tileset via AJAX
    loadTsx (path) {
        let req = new XMLHttpRequest();
        let that = this;
        req.addEventListener("load", function() {
            let name = this.responseXML.getElementsByTagName('tileset')[0].getAttribute('name');
            let src = this.responseXML.getElementsByTagName('image')[0].getAttribute('source');
            let properties = this.responseXML.getElementsByTagName('properties')[0];
            //initialized
            let attributes = {layer: 0, author: 'unknown', category: 'uncategorized', sex: 0, license: 'unknown', url: '', incomplete: 0};
            //parse all custom properties
            for (let i in properties.children) {
                if( properties.children[i].hasAttribute){
                    attributes[properties.children[i].getAttribute('name')] = properties.children[i].getAttribute('value');
                }
            }
            //don't load incomplete spritesheets
            if(attributes['incomplete'] == 'true')
                return;
            
            let tmpSprite = new Spritesheet(name, src, attributes);
            //allow multiple sprites with same name
            if(that.spritesheets[name]){
                that.spritesheets[name].push(tmpSprite)
            }else{
                that.spritesheets[name] = [tmpSprite];
            }
            //manage categories
            let categories = attributes['category'].split(';');
            //go through all categories and add them if neccessary
            let lastCat = that.categories;
            for (let i in categories) {
                if (!lastCat.hasCategory(categories[i])) {
                    lastCat.addCategory(categories[i]);
                }
                lastCat = lastCat.getCategory(categories[i]);
            }
            //add sprite to latest category
            if(!lastCat.hasSpriteset(name))
                lastCat.addSpriteset(that.spritesheets[name]);
    
            //manage authors
            //TODO: load author JSON
            let authors = attributes['author'].split(';');
            for (let i in authors){
                //create if doesn’t exist
                if(!that.authors[authors[i]]){
                    that.loadAuthor(authors[i], tmpSprite);
                } else {
                    that.authors[authors[i]].addSprite(tmpSprite);
                }
            }
            that.updateGui();
        })
        req.open('GET', path);
        req.responseType = 'document';
        req.overrideMimeType('text/xml');
        req.send();
    }

    //load author via AJAX
    loadAuthor (name, sprite) {
        let req = new XMLHttpRequest();
        req.open('GET', 'authors/' + name + '.json');
        req.responseType = 'text';
        req.overrideMimeType('text/json');
        let that = this;
        req.addEventListener("load", function(){
            //convert to json and iterate through the array
            var author = JSON.parse(this.responseText);
            if(!that.authors[name])
                that.authors[name] = new Author(author.name, author.url);
            that.authors[name].addSprite(sprite);
        })
        req.send();
    }

    //load sprite list via AJAX
    loadList (path) {
        let req = new XMLHttpRequest();
        req.open('GET', path + 'list.json');
        req.responseType = 'text';
        req.overrideMimeType('text/json');
        let that = this;
        req.addEventListener("load", function(){
            //convert to json and iterate through the array
            var list = JSON.parse(this.responseText);
            for (let i in list) {
                //check file extensions
                if (list[i].split('.').pop() == 'tsx') {
                    that.loadTsx(path + list[i]);
                }
                if (list[i][list[i].length - 1] == '/') {
                    that.loadList(path + list[i]);
                }
                //ignore exerything else
            }
        })
        req.send();
    }
}

window.lpcGenerator = new LpcGenerator();
window.onload=function (){
    lpcGenerator.loadList('spritesheets/');
};