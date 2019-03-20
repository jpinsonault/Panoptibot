function groupBy(collection, grouper) {
    groups = new DefaultDict(Array)

    collection.forEach(item => {
        groups[grouper(item)].push(item)
    })

    return groups
}

class DefaultDict {
    constructor(defaultInit) {
        return new Proxy({}, {
            get: (target, name) => name in target ?
                target[name] : (target[name] = typeof defaultInit === 'function' ?
                    new defaultInit().valueOf() :
                    defaultInit)
        })
    }
}

module.exports.groupBy = groupBy
module.exports.DefaultDict = DefaultDict