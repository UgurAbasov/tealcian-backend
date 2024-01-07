export default function groupMessagesByDate(messages) {
    const groupedMessages = {};
  
    messages.forEach((message) => {
      const messageDate = new Date(message.time);
      const formattedDate = messageDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
  
      if (!groupedMessages[formattedDate]) {
        groupedMessages[formattedDate] = {
          time: formattedDate,
          data: [],
        };
      }
  
      groupedMessages[formattedDate].data.push(message);
    });
  
    // Convert the object into an array of values
    const result = Object.values(groupedMessages);
  
    return result;
  }
  