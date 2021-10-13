export interface IPubSubHandle {
    slot: any;
    key: number;
}

export class PubSubEvent {

    constructor(public readonly topic: string,
                public readonly verb: string,
                public readonly origin: string,
                public readonly data: string,) {
    }

    toString() {
        return `${this.topic}:${this.verb} From: ${this.origin} Data: ${JSON.stringify(
            this.data
        )}`;
    }

    get isRequest() {
        return this.verb.endsWith("-request")
    }
}

let Trace = false

/**
 * You can add "!" in the beginning of a topic name to indicate you expect the message to be handled and if it doesn't
 * it means it's an error.
 *
 * If a callback return truthy, it means broadcasting should stop.
 *
 * Normally, you won't need to use this class, but only its default
 * instance, which is also the default export of this module.
 */
export class PubSub {
    keyCounter = 1;
    topics: any = {};

    constructor(public readonly name: string) {
    }

    set trace(on: boolean) {
        Trace = on
    }

    get trace() {
        return Trace
    }

    private on_(cb: (event: PubSubEvent) => boolean, topic: string, verb: string): IPubSubHandle {
        const slot = this.getSubscriptionsSlot(topic, verb);
        const key = this.keyCounter++;
        slot[key] = cb;
        return {
            slot,
            key
        };
    }

    private once_(cb: (event: PubSubEvent) => boolean, topic: string, verb: string, timeout?: number) {
        let subscriptionHandle = this.on_(innerCb, topic, verb);
        let self = this;
        timeout && setTimeout(() => {
            self.off(subscriptionHandle);
            console.log("expected event wasn't generated withing time limit");
        }, timeout);

        function innerCb(event: PubSubEvent): boolean {
            self.off(subscriptionHandle);
            return cb(event);
        }
    }

    publish(origin: string, topic: string, verb: string, data?: any):void {
        const logUnreceived = topic.startsWith("!");
        if (logUnreceived) topic = topic.substr(1);

        if ([topic, verb].indexOf("*") != -1)
            throw new Error("You can't publish with a wildcard");
        const event = new PubSubEvent(
            topic,
            verb,
            origin,
            data);

        const handled = {handled: false};
        let slot = this.getSubscriptionsSlot(topic, verb);
        if (!this.broadcast(slot, event, handled)) return;

        slot = this.getSubscriptionsSlot(topic, "*");
        this.broadcast(slot, event, handled);

        if (logUnreceived && !handled.handled) {
            console.warn(
                `Event published, but no one listened: ${JSON.stringify(event)}`
            );
        }
    }

    private broadcast(
        slot: any | {},
        event: PubSubEvent,
        handled: { handled: boolean }
    ): boolean {
        if (Trace)
            console.info(`${this.name} broadcasting ${event}`)
        for (let cb of Object["values"](slot)) {
            handled.handled = true
            if ((<any>cb)(event)) {
                return false
            }
        }
        return true
    }

    private getSubscriptionsSlot(topic: string, verb: string) {
        const t: any = this.topics[topic] || (this.topics[topic] = {})
        return t[verb] || (t[verb] = {})
    }

    /**
     * Listens to events.
     * @param event given in the form of topic:verb while verb may be '*'
     * @param handler
     * @return a handle, by which you can cancel the listening (using the off method here)
     */
    on(event: string, handler: (event: PubSubEvent, data: any) => boolean | void) {
        let [topic, verb] = event.split(":")
        verb = verb || "*"

        let h = (e: PubSubEvent): boolean => {
            return !!handler(e, e.data)
        };
        return this.on_(h, topic, verb)
    }

    /**
     * listens to an event and after handling it, automatically cancels the listening
     * @param event
     * @param handler
     */
    once(event: string, handler: (event: PubSubEvent, data: any) => boolean | void) {
        let [topic, verb] = event.split(":");
        verb = verb || "*";

        let h = (e: PubSubEvent): boolean => {
            return !!handler(e, e.data);
        };
        return this.once_(h, topic, verb);
    }

    /**
     * Cancels a subscription to an event
     * @param subscription
     */
    off(subscription: IPubSubHandle) {
        return delete subscription.slot[subscription.key];
    }

    /**
     * send an event asynchronously
     * @param sender
     * @param eventOrTopic you can use the short form (topic:verb) or the long form, with separate parameters
     * @param dataOrVerb
     * @param data
     */
    triggerAsync(sender: string, eventOrTopic: string, dataOrVerb: string | any, data?: any): void {

        // @ts-ignore
        setTimeout(() => this.trigger(...arguments), 0)
    }

    /**
     * send an event
     * @param sender
     * @param eventOrTopic you can use the short form (topic:verb) or the long form, with separate parameters
     * @param dataOrVerb
     * @param data
     */
    trigger(sender: string, eventOrTopic: string, dataOrVerb: string | any, data?: any): void {
        if (eventOrTopic.includes(':')) {
            let [topic, verb] = eventOrTopic.split(":");
            if (data) throw new Error("Unexpected parameter");
            this.trigger(sender, topic, verb, dataOrVerb);
            return;
        }

        this.publish(sender, eventOrTopic, dataOrVerb, data);
    }
}

export default new PubSub('Main Dispatcher')
