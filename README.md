# AI Data Analysis Hub

A modern, AI-powered data analysis platform that allows users to upload datasets and interact with them using natural language queries. Built with Next.js 14, TypeScript, and Google Gemini AI.

## 🚀 Features

### Core Functionality
- **Two-Panel Interface**: Clean, intuitive layout with file management on the left and chat interface on the right
- **File Upload Support**: Drag-and-drop or browse to upload CSV, JSON, and Excel files
- **AI-Powered Analysis**: Natural language querying powered by Google Gemini AI
- **Interactive Chat**: Contextual conversations about your data with AI assistance
- **Data Visualizations**: Automatic generation of charts, graphs, and statistical summaries
- **Real-time Processing**: Instant file parsing and preview capabilities

### Data Processing
- **Multi-format Support**: CSV, JSON, XLSX, XLS file formats
- **Automatic Data Parsing**: Smart detection of data types and structure
- **Statistical Analysis**: Automatic generation of summary statistics
- **Data Preview**: Quick overview of dataset structure and sample data

### Visualizations
- **Interactive Charts**: Bar charts, pie charts, line graphs using Recharts
- **Statistical Summaries**: Numeric and categorical data analysis
- **Time Series Analysis**: Automatic detection and visualization of temporal data
- **Data Tables**: Responsive, paginated data viewing

### AI Capabilities
- **Natural Language Queries**: Ask questions about your data in plain English
- **Contextual Responses**: AI understands your dataset structure and content
- **Statistical Insights**: Automatic generation of trends, patterns, and recommendations
- **Smart Analysis**: Handles both numeric and categorical data analysis

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **AI Integration**: Google Gemini AI API
- **Charts**: Recharts for data visualization
- **State Management**: React hooks (useState, useRef)
- **File Processing**: Client-side CSV/JSON parsing
- **Notifications**: Sonner toast library

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Google Gemini AI API key (optional but recommended for full functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-data-analysis-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Optional: Add your Google Gemini AI API key for full AI functionality
   GEMINI_API_KEY=your_api_key_here
   ```
   
   To get a Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production
```bash
npm run build
npm start
```

## 📖 How to Use

### 1. Upload Your Data
- **Drag and Drop**: Simply drag your CSV, JSON, or Excel file into the upload area
- **Browse Files**: Click "Browse Files" to select files from your computer
- **Supported Formats**: CSV, JSON, XLSX, XLS

### 2. Explore Your Data
- **Files Tab**: View all uploaded files with metadata (rows, size, upload time)
- **Charts Tab**: Automatic visualizations including:
  - Statistical summaries
  - Data preview tables
  - Bar charts for numeric data
  - Pie charts for categorical data
  - Time series analysis (if date columns detected)

### 3. Chat with Your Data
- **Select a File**: Click on any uploaded file to activate the chat interface
- **Ask Questions**: Use natural language to query your data:
  - "What are the main trends in this data?"
  - "Can you summarize the key statistics?"
  - "Show me a breakdown by category"
  - "What insights can you find in the sales data?"
- **Get AI Insights**: Receive detailed analysis, patterns, and recommendations

### Example Queries
- "What's the average value in the price column?"
- "How many unique categories are there?"
- "What are the top 5 performers in this dataset?"
- "Can you identify any outliers or anomalies?"
- "What trends do you see over time?"

## 🎨 UI Components

The application uses a modern, responsive design with:
- **Dark/Light Mode**: Automatic theme detection
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Interactive Elements**: Smooth animations and transitions
- **Accessible Design**: WCAG compliant interface
- **Toast Notifications**: Real-time feedback for user actions

## 🔧 Configuration

### Environment Variables
Check the current environment configuration at `/env-check` route.

Required for AI functionality:
- `GEMINI_API_KEY`: Google Gemini AI API key

### File Size Limits
- Maximum file size: Browser-dependent (typically 2GB for modern browsers)
- Recommended: Files under 100MB for optimal performance

## 🤝 Contributing

This project is built with modern best practices:
- **TypeScript**: Full type safety
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit checks

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the `/env-check` route for configuration issues
2. Ensure your API key is correctly set (if using AI features)
3. Try with a smaller dataset first
4. Check browser console for error messages

## 🔮 Future Enhancements

- **Database Integration**: Persistent storage for uploaded files
- **User Authentication**: Multi-user support with Supabase Auth
- **Advanced Visualizations**: More chart types and customization
- **Export Features**: Download analysis results and charts
- **Collaborative Features**: Share datasets and insights
- **API Integration**: Connect to external data sources
- **Machine Learning**: Predictive analytics and advanced modeling

---

Built with ❤️ using Next.js, TypeScript, and Google Gemini AI