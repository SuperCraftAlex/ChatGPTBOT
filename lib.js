class Character {

    name = "";
    def = "";            //path to definition file
    memory = "";         // path to memory file


    constructor(name, def, memory) {
        this.name = name;
        this.def = def;
        this.memory = memory;
    }

    postRequest() { //

    }

}

module.exports = { Character: Character };