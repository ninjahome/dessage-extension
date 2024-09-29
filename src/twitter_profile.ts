class ImageObject {
    "@type": "ImageObject";
    contentUrl: string;
    thumbnailUrl: string;

    constructor(contentUrl: string, thumbnailUrl: string) {
        this["@type"] = "ImageObject";
        this.contentUrl = contentUrl;
        this.thumbnailUrl = thumbnailUrl;
    }
}

class InteractionCounter {
    "@type": "InteractionCounter";
    interactionType: string;
    name: string;
    userInteractionCount: number;

    constructor(interactionType: string, name: string, userInteractionCount: number) {
        this["@type"] = "InteractionCounter";
        this.interactionType = interactionType;
        this.name = name;
        this.userInteractionCount = userInteractionCount;
    }
}

class Place {
    "@type": "Place";
    name: string;

    constructor(name: string) {
        this["@type"] = "Place";
        this.name = name;
    }
}

class Person {
    "@type": "Person";
    additionalName: string;
    description: string;
    givenName: string;
    homeLocation: Place;
    identifier: string;
    image: ImageObject;
    interactionStatistic: InteractionCounter[];
    url: string;

    constructor(additionalName: string, description: string, givenName: string, homeLocation: Place, identifier: string, image: ImageObject, interactionStatistic: InteractionCounter[], url: string) {
        this["@type"] = "Person";
        this.additionalName = additionalName;
        this.description = description;
        this.givenName = givenName;
        this.homeLocation = homeLocation;
        this.identifier = identifier;
        this.image = image;
        this.interactionStatistic = interactionStatistic;
        this.url = url;
    }
}

export class ProfilePage {
    "@context": string = "http://schema.org";
    "@type": string = "ProfilePage";
    dateCreated: string;
    author: Person;
    contentRating: string;
    relatedLink: string[];

    constructor(dateCreated: string, author: Person, contentRating: string, relatedLink: string[]) {
        this.dateCreated = dateCreated;
        this.author = author;
        this.contentRating = contentRating;
        this.relatedLink = relatedLink;
    }
}
