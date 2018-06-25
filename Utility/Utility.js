function CreateFunction(owner, func) {
    return function() {
        return func.apply(owner, arguments);
    }
}

module.exports = {CreateFunction};