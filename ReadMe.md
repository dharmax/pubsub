# General

This is a pub-sub dispatcher that has a few additional tweaks. It works with topics and verbs, and the verb can be a
wildcard (in the listener, of course) and it keeps the origin of the event, as well as a trace feature - which can both
be useful to track intricate event flows.

# installation

`npm i @dharmax/pubsub`

# Usage

```typescript

import dispatcher from '@dharmax/pubsub'


dispatcher.trigger('tester', 'my-topic:my-verb', {myString: 'my data'})

dispatcher.trace( true)

const myListener = dispatcher.on('my-topic:my-verb', event => {
    console.log({
        data: event.data.myString,
        origin: event.origin
    })
})

// you can destroy the handler
dispatcher.off(myListener)

```

You also have the method `once` and `dispatcher.triggerAsync` .
