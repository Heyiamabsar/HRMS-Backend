


export const skipEmails = ["faisalad@gmail.com", "dummy@gmail.com",'faisalem@gmail.com','faisalem13@gmail.com','faisalem14@gmail.com','faisalem15@gmail.com',"fmslhr@gmail.com","fmslhr1@gmail.com","fmslhr2@gmail.com","fmslhr3@gmail.com","super@gmail.com",];


export const withoutDeletedUsers = (baseFilter = {}) => ({
  ...baseFilter,
  isDeleted: false,
});