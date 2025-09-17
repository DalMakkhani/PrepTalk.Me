'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when component mounts
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your interview preparation assistant. I can help you with interview tips, practice questions, career advice, and more. How can I assist you today?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: 'interview_preparation',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="h-[calc(100vh-8rem)] flex flex-col mt-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Interview Assistant</h1>
          <p className="text-gray-600">Get personalized interview preparation advice and practice tips</p>
        </div>
        
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Bot className="h-6 w-6" />
              AI Assistant Chat
            </CardTitle>
            <CardDescription>
              Ask me anything about interview preparation, tips, or practice questions
            </CardDescription>
          </CardHeader>
            
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-10 w-10 mt-1 ring-2 ring-blue-100">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-10 w-10 mt-1 ring-2 ring-gray-100">
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 mt-1 ring-2 ring-blue-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Container */}
            <div className="border-t bg-white p-6">
              <div className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about interview preparation, tips, or practice questions..."
                  className="flex-1 h-12 px-4 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-500">
                  Press Enter to send • Shift+Enter for new line
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  AI Assistant Online
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
}
