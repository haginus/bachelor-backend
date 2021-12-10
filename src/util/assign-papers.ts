import { Op } from "sequelize";
import { Committee, Paper, sequelize, Teacher, User } from "../models/models"
import { arrayIntersection, copyObject, removeDuplicates, ResponseError } from "./util";

export const autoAssignPapers = async () => {
    const committeesDb = await Committee.findAll({
        include: [{
            model: Teacher.scope('defaultScope'),
            as: 'members',
            include: [User.scope("min"), Teacher.associations.offers]
        }]
    });
    const committees: ExtendedCommittee[] = copyObject(committeesDb);
    // Get topics for each committee
    committees.forEach(committee => {
        committee.topicIds = removeDuplicates(committee.members.flatMap(member => {
            return member.offers.flatMap(offer => {
                return offer.topics.map(topic => topic.id);
            });
        }));
        committee.domainIds = committee.domains.map(domain => domain.id);
        committee.addedPaperIds = [];
        committee.totalPaperNumber = committee.papers.length;
    });

    const papers = copyObject<ExtendedPaper[]>(await Paper
        .scope(['topics', 'teacher', 'student'])
        .findAll({ where: { submitted: true, isValid: {[Op.or]: [null, true]}, type: 'bachelor', committeeId: null } })
    ).map(paper => {
        const paperTopics = paper.topics.map(topic => topic.id);
        let compatibleWith = [];
        committees.forEach((committee, committeeIdx) => {
            const paperTeacherInCommittee = committee.members.findIndex(member => member.id == paper.teacher.id) >= 0;
            const domainCompatibility = committee.domainIds.includes(paper.student.domainId);
            if(!paperTeacherInCommittee && domainCompatibility && arrayIntersection(committee.topicIds, paperTopics)) {
                compatibleWith.push(committeeIdx);
            }
        });
        paper.compatibleWith = compatibleWith;
        return paper;
    });


    let assignedPapers = 0;
    const totalPapers = papers.length;

    papers.forEach(paper => {
        const compatibleWith = paper.compatibleWith;
        // find the less busy committee
        compatibleWith.sort((idx1, idx2) => {
            const c1 = committees[idx1];
            const c2 = committees[idx2];
            return c1.totalPaperNumber - c2.totalPaperNumber;
        });
        // assign to the first committee (if it exists)
        if(compatibleWith.length) {
            const committeeIdx = compatibleWith[0];
            committees[committeeIdx].addedPaperIds.push(paper.id);
            committees[committeeIdx].totalPaperNumber++;
            assignedPapers++;
        }
    });
    
    const transaction = await sequelize.transaction();
    try {
        await Promise.all(committees.map((committee, idx) => {
            if(committee.addedPaperIds.length) {
                return committeesDb[idx].addPapers(committee.addedPaperIds, { transaction });
            }
            return Promise.resolve();
        }));
        await transaction.commit();
        return { success: true, assignedPapers, totalPapers };
    } catch(err) {
        await transaction.rollback();
        throw new ResponseError('A apărut o eroare. Contactați administratorul.', 'INTERNAL_ERROR', 500);
    }
}

interface ExtendedCommittee extends Committee {
    topicIds?: number[];
    domainIds?: number[];
    addedPaperIds?: number[];
    totalPaperNumber?: number
}

interface ExtendedPaper extends Paper {
    // Indexes of the committee
    compatibleWith?: number[];
}