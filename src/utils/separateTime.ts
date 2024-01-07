function groupMessagesByDate(messages) {
    const groupedMessages = {};
  
    messages.forEach((message) => {
      const messageDate = new Date(message.time);
      const formattedDate = messageDate.toDateString();
  
      if (!groupedMessages[formattedDate]) {
        groupedMessages[formattedDate] = {
          time: formattedDate,
          data: [],
        };
      }
  
      groupedMessages[formattedDate].data.push(message);
    });
  
const result = Object.values(groupedMessages);
  
    return result;
  }