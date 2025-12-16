interface ChildInfo {
    name: string;
    gender: "male" | "female" | "other";
  }
  
  function getPronouns(gender: ChildInfo["gender"]) {
    if (gender === "male") {
      return {
        subject: "he",
        object: "him",
        possessive: "his",
      };
    }
  
    if (gender === "female") {
      return {
        subject: "she",
        object: "her",
        possessive: "her",
      };
    }
  
    return {
      subject: "they",
      object: "them",
      possessive: "their",
    };
  }
  
  export function personalizeTemplate(
    template: any,
    child: ChildInfo
  ) {
    const pronouns = getPronouns(child.gender);
  
    const pages = template.pages.map((page: any) => {
      let text = page.text;
  
      text = text.replace(/{{child_name}}/g, child.name);
      text = text.replace(/{{pronoun_subject}}/g, pronouns.subject);
      text = text.replace(/{{pronoun_object}}/g, pronouns.object);
      text = text.replace(/{{pronoun_possessive}}/g, pronouns.possessive);
  
      return {
        ...page,
        text: text.trim(), // removes \n
      };
    });
  
    return {
      title: template.title.trim(),
      topicKey: template.topicKey.trim(),
      targetAgeGroup: template.targetAgeGroup.trim(),
      pages,
    };
  }
  