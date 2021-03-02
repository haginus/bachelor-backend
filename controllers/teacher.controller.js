const { User, Teacher, Offer, sequelize, Domain, Topic } = require("../models/models.js");
const UserController = require('./user.controller')
const { Op } = require("sequelize");


exports.validateTeacher = async (uid) => {
    return UserController.validateUser(uid);
}

exports.getTeacherByUserId = (uid) => {
    return Teacher.findOne({ where: { userId: uid } });
}

exports.getOffers = async (uid) => {
    const teacher = await Teacher.findOne({ where: { userId: uid } });
    const offers = Offer.findAll({
        where: {
            teacherId: teacher.id
        },
        attributes: {
            include: [
                [ literals.countOfferApplications, "pendingApplications" ],
                [ literals.countOfferAcceptedApplications, "takenPlaces" ],
            ]
        },
        include: [
            {
                model: Domain,
            },
            {
                model: Topic,
                through: {
                    attributes: []
                }
            }
        ]
    })
    return offers
}

exports.editOffer = async (uid, offerId, domainId, topicIds, limit) => {
    let offer = await Offer.findOne({
        where: { id: offerId },
        attributes: {
            include: [
                [literals.countOfferAcceptedApplications, "takenPlaces"]
            ]
        }
    });

    const teacher = await this.getTeacherByUserId(uid);

    if(offer.teacherId != teacher.id) {
        throw "UNAUTHORIZED"
    }

    if(offer.takenPlaces > limit) {
        throw "LIMIT_LOWER_THAN_TAKEN_PLACES"
    }

    let topics = await Topic.findAll({
        where: {
            id: {
                [Op.in]: topicIds
            }
        }
    });

    try {
        offer.domainId = domainId;
        offer.limit = limit;
        await offer.save();
        await offer.setTopics(topics);
    } catch(err) {
        console.log(err)
        throw "VALIDATION_ERROR";
    }
    return offer;
}

exports.addOffer = async (uid, domainId, topicIds, limit) => {

    if(limit < 1) {
        throw "LIMIT_LOWER_THAN_1";
    }

    const teacher = await this.getTeacherByUserId(uid);

    let topics = await Topic.findAll({
        where: {
            id: {
                [Op.in]: topicIds
            }
        }
    });

    try {
        const offer = await Offer.create({ domainId, limit, teacherId: teacher.id });
        await offer.setTopics(topics);
        return offer;
    } catch(err) {
        console.log(err)
        throw "VALIDATION_ERROR";
    }
}

exports.getDomains = () => {
    return Domain.findAll();
}


const literals = {
    countOfferAcceptedApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted = 1
    )`),
    countOfferApplications: sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`offer\`.id
            AND
            application.accepted IS NULL
    )`)
}