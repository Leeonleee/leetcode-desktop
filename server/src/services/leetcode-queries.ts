import type { Domain } from "../types/domain.js";

const USER_STATUS_QUERY = `
  query globalData {
    userStatus {
      userId
      userSlug
      username
      isSignedIn
      isPremium
      isVerified
      activeSessionId
    }
  }
`;

const QUESTION_OF_TODAY_QUERY_COM = `
  query questionOfToday {
    todayRecord: activeDailyCodingChallengeQuestion {
      question {
        titleSlug
      }
    }
  }
`;

const QUESTION_OF_TODAY_QUERY_CN = `
  query questionOfToday {
    todayRecord {
      question {
        titleSlug
      }
    }
  }
`;

const QUESTION_DETAIL_QUERY = `
  query question($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      isPaidOnly
      difficulty
      likes
      dislikes
      categoryTitle
      content
      mysqlSchemas
      dataSchemas
      codeSnippets {
        lang
        langSlug
        code
      }
      exampleTestcaseList
      metaData
      acRate
      stats
      hints
      topicTags {
        name
        slug
      }
      similarQuestionList {
        difficulty
        titleSlug
        title
        isPaidOnly
      }
    }
  }
`;

export const queries = {
  userStatus: USER_STATUS_QUERY,
  questionDetail: QUESTION_DETAIL_QUERY,
  questionOfToday(domain: Domain) {
    return domain === "cn" ? QUESTION_OF_TODAY_QUERY_CN : QUESTION_OF_TODAY_QUERY_COM;
  }
};
