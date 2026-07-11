ok so the current state of project - i dont think its in a good state, usability wise, still we are not known, what we are trying to build

so basically my intial think was that you import contacts of hr or any employee of a company - the main things for the whole app is the contact, we could have multiple person or department email for the same company so there is no link as i can think of now. generally all the employee and team like or anyone has same pattern in same org name@companydomain so this becomes our grouping for multiple empoyess or team in same company or org.

also we shoudl not be able to import same contact and idetifier will be email, also even after importing the contacts, we dont send multiple email to same, continous ones will be follow ups in the same thread but we need track things as status

- templates will be cold email and when sending emaisl to contacts, we fillin the varaible based on the details

like for templates, we can have multiple whose variables will be filled when sending to contact - like intial, follow up 1, 2 or so. even with multi variations so we keep them in db

and when sending email in group for multiple custom obvioulst for that we are building this,

so done over complicate things. see from contacts we havee mainly 3 things. person name , email , maybe designation or role and company

so templates variables will be like that

so the order of fix if it is for the mess as of now should be we first fix the schema, before doing anything

somethings to consider

for thnongs lkike status and important factors we will use enums not string or text, we will be sending like 100 email at once, so we have to think about queue. if from frontend we say send emails or close the app then if we are doing sending one by one as of now either frontend block or if we close and frontend is doing loop then it breaks or if backend is doing then other things are blocked as if frontend is free goes to other screens and make any other api call so need to think about, also there can be issue of multiple login attemplts as we are sending emails thjrough smtp and app password for gmail

let me clarify at the end what we try to achieve we have contacts, we send email in bulk, as we doing this for job, we are using personal email, smtp and app password, wee will have dynamic template that we select after choosing contact (companies) whom to send email too, obviouly wont be doing like selecting group of alreay send and new in same group and selecting intial template, that is user issue, or better we filter them based on status we discussed earlier so less error chance
