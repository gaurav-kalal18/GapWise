'use strict';
const {parse,buildJobProfile}=require('./jd.assessment.service');
const extractJobSkills=description=>parse(description).requiredSkills;
module.exports={extractJobSkills,buildJobProfile};
