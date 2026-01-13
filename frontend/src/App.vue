<template>
  <div class="min-h-screen bg-gradient-to-br from-whatsapp-50 to-green-100">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-whatsapp-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">WhatsApp Bot</h1>
              <p class="text-sm text-gray-500">Bulk Message Sender</p>
            </div>
          </div>
          
          <!-- Connection Status -->
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-2">
              <div :class="[
                'w-3 h-3 rounded-full',
                connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
              ]"></div>
              <span class="text-sm font-medium" :class="[
                connectionStatus.connected ? 'text-green-700' : 'text-red-700'
              ]">
                {{ connectionStatus.connected ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <button 
              @click="checkConnectionStatus"
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh connection status"
            >
              <svg class="w-4 h-4" :class="{ 'animate-spin': isCheckingStatus }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'whatsapp'"
            :class="[
              activeTab === 'whatsapp'
                ? 'border-whatsapp-500 text-whatsapp-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center'
            ]"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
            </svg>
            WhatsApp Marketing
          </button>

          <button
            @click="activeTab = 'email'"
            :class="[
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center'
            ]"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Marketing
          </button>
        </nav>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Upload Section -->
        <div class="lg:col-span-2">
          <div class="card p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Upload CSV File</h2>
            
            <!-- File Upload Area -->
            <div class="mb-6">
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-whatsapp-400 transition-colors">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div class="mb-4">
                  <label for="file-upload" class="cursor-pointer">
                    <span class="text-lg font-medium text-whatsapp-600 hover:text-whatsapp-500">
                      Click to upload
                    </span>
                    <span class="text-gray-500"> or drag and drop</span>
                  </label>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    accept=".csv,.xlsx"
                    class="sr-only" 
                    @change="handleFileSelect"
                    ref="fileInput"
                  />
                </div>
                <p class="text-sm text-gray-500">CSV files only, up to 10MB</p>
              </div>

               <!-- Subject Input (Email Only) -->
              <div v-if="activeTab === 'email'" class="mb-6">
                <label for="emailSubject" class="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                <input
                  id="emailSubject"
                  v-model="emailSubject"
                  type="text"
                  placeholder="Important Update: {{name}}"
                  class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <!-- Custom Message Input -->
<div class="mb-6">
  <label for="customMessage" class="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
  <textarea
    id="customMessage"
    v-model="customMessage"
    placeholder="Hi {{name}}, your service is confirmed."
    rows="4"
    class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-500"
  ></textarea>
  <p class="text-xs text-gray-500 mt-1">Use <code>{{name}}</code> as a placeholder for personalization.</p>
</div>
<!-- Image Upload (WhatsApp Only) -->
<div v-if="activeTab === 'whatsapp'" class="mb-6">
  <label class="block text-sm font-medium text-gray-700 mb-1">Attach Image (optional)</label>
  <input 
    type="file" 
    accept="image/*"
    @change="handleImageSelect"
    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded file:bg-whatsapp-50 hover:file:bg-whatsapp-100"
  />
  <p v-if="selectedImage" class="text-sm mt-1 text-gray-600">{{ selectedImage.name }}</p>
</div>

              
              <!-- Selected File Info -->
              <div v-if="selectedFile" class="mt-4 p-4 bg-whatsapp-50 rounded-lg border border-whatsapp-200">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center space-x-3">
                    <svg class="w-8 h-8 text-whatsapp-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <div>
                      <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
                      <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                    </div>
                  </div>
                  <button 
                    @click="clearFile"
                    class="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- File Validation Info -->
                <div v-if="fileValidation" class="mt-4 space-y-3">
                  <!-- Validation Status -->
                  <div :class="[
                    'p-3 rounded-lg border',
                    fileValidation.validation.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  ]">
                    <div class="flex items-start space-x-2">
                      <svg v-if="fileValidation.validation.isValid" class="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else class="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <div class="flex-1">
                        <p class="text-sm font-medium" :class="fileValidation.validation.isValid ? 'text-green-800' : 'text-yellow-800'">
                          {{ fileValidation.message }}
                        </p>
                        <p class="text-xs mt-1" :class="fileValidation.validation.isValid ? 'text-green-700' : 'text-yellow-700'">
                          {{ fileValidation.validation.suggestions.required }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Detected Columns -->
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-sm font-medium text-gray-700 mb-2">Detected Columns ({{ fileValidation.totalColumns }}):</p>
                    <div class="flex flex-wrap gap-2">
                      <span 
                        v-for="(col, index) in fileValidation.columns" 
                        :key="index"
                        class="px-2 py-1 text-xs rounded"
                        :class="[
                          fileValidation.validation.columns.phone === col ? 'bg-green-100 text-green-800 font-medium' :
                          fileValidation.validation.columns.name === col || 
                          fileValidation.validation.columns.firstName === col ||
                          fileValidation.validation.columns.lastName === col ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        ]"
                      >
                        {{ col }}
                        <span v-if="fileValidation.validation.columns.phone === col" class="ml-1">📞</span>
                        <span v-else-if="fileValidation.validation.columns.name === col || 
                                         fileValidation.validation.columns.firstName === col ||
                                         fileValidation.validation.columns.lastName === col" class="ml-1">👤</span>
                      </span>
                    </div>
                  </div>

                  <!-- Suggestions -->
                  <div v-if="fileValidation.validation.suggestions.optional.length > 0" class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p class="text-sm font-medium text-blue-800 mb-2">💡 Suggestions:</p>
                    <ul class="text-xs text-blue-700 space-y-1">
                      <li v-for="(suggestion, index) in fileValidation.validation.suggestions.optional" :key="index">
                        {{ suggestion }}
                      </li>
                    </ul>
                  </div>

                  <!-- Sample Data Preview -->
                  <div v-if="fileValidation.sampleData && fileValidation.sampleData.length > 0" class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p class="text-sm font-medium text-gray-700 mb-2">Sample Data (first {{ fileValidation.sampleRows }} rows):</p>
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-xs">
                        <thead class="bg-gray-100">
                          <tr>
                            <th v-for="col in fileValidation.columns" :key="col" class="px-2 py-1 text-left text-gray-600 border-b">
                              {{ col }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, rowIndex) in fileValidation.sampleData" :key="rowIndex" class="border-b">
                            <td v-for="col in fileValidation.columns" :key="col" class="px-2 py-1 text-gray-700">
                              {{ row[col.toLowerCase()] || row[col] || '-' }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Loading State -->
                <div v-if="isValidatingFile" class="mt-4 flex items-center space-x-2 text-sm text-gray-600">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Validating file structure...</span>
                </div>
              </div>
            </div>

            <!-- CSV Format Info -->
            <!-- Format Info -->
            <div class="mb-6 p-4 rounded-lg border" :class="activeTab === 'whatsapp' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'">
              <div v-if="activeTab === 'whatsapp'" class="text-sm text-blue-800 space-y-1">
                <p class="font-bold mb-1">WhatsApp CSV Format:</p>
                <p class="text-red-600">• Do Not Include country code in phone numbers (e.g., +911234567890)</p>
                <p>• Required column: <code>number</code> or <code>mobile</code></p>
                <p>• Optional: <code>name</code>, custom columns</p>
              </div>
              <div v-else class="text-sm text-yellow-800 space-y-1">
                 <p class="font-bold mb-1">Email CSV Format:</p>
                 <p>• Required column: <code>email</code></p>
                 <p>• Optional: <code>name</code>, custom columns</p>
                 <p>• <span class="font-medium">Note:</span> Emails are rate-limited to prevent spam (approx 1 every 3s).</p>
              </div>
            </div>

            <!-- Send Button -->
            <div class="flex justify-center">
              <button 
                @click="sendMessages"
                :disabled="!selectedFile || isProcessing || !connectionStatus.connected"
                class="btn-primary px-8 py-3 text-lg flex items-center space-x-2"
              >
                <svg v-if="isProcessing" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>{{ isProcessing ? 'Sending Messages...' : 'Send Messages' }}</span>
              </button>
            </div>

            <!-- Connection Warning (WhatsApp Only) -->
            <div v-if="activeTab === 'whatsapp' && !connectionStatus.connected" class="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p class="text-red-800 font-medium">WhatsApp not connected</p>
              </div>
              <p class="text-red-700 text-sm mt-1">Please scan the QR code in the backend terminal to connect WhatsApp Web.</p>
            </div>
          </div>
        </div>

        <!-- Status & Results Section -->
        <div class="lg:col-span-1">
          <div class="card p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Status</h3>
            
            <!-- Processing Status -->
            <div v-if="isProcessing" class="mb-6">
              <div class="flex items-center space-x-3 mb-3">
                <div class="animate-spin w-6 h-6 border-2 border-whatsapp-600 border-t-transparent rounded-full"></div>
                <span class="font-medium text-gray-900">Processing...</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-whatsapp-600 h-2 rounded-full transition-all duration-300" :style="{ width: progressPercentage + '%' }"></div>
              </div>
              <p class="text-sm text-gray-600 mt-2">{{ progressMessage }}</p>
            </div>

            <!-- Results Summary -->
            <div v-if="results.length > 0" class="mb-6">
              <h4 class="font-medium text-gray-900 mb-3">Summary</h4>
              <div class="space-y-2">
                <div class="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span class="text-green-800">Sent</span>
                  <span class="font-bold text-green-900">{{ statistics.sent }}</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span class="text-red-800">Failed</span>
                  <span class="font-bold text-red-900">{{ statistics.failed }}</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span class="text-gray-800">Total</span>
                  <span class="font-bold text-gray-900">{{ statistics.total }}</span>
                </div>
              </div>
            </div>

            <!-- Detailed Results -->
            <div v-if="results.length > 0" class="max-h-96 overflow-y-auto">
              <h4 class="font-medium text-gray-900 mb-3">Detailed Results</h4>
              <div class="space-y-2">
                <div 
                  v-for="(result, index) in results" 
                  :key="index"
                  class="p-3 rounded-lg border fade-in"
                  :class="result.status === 'sent' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm truncate" :class="result.status === 'sent' ? 'text-green-900' : 'text-red-900'">
                        {{ result.number }}
                      </p>
                      <p class="text-xs mt-1 truncate" :class="result.status === 'sent' ? 'text-green-700' : 'text-red-700'">
                        {{ result.message }}
                      </p>
                      <p v-if="result.error" class="text-xs text-red-600 mt-1">
                        {{ result.error }}
                      </p>
                    </div>
                    <div class="ml-2 flex-shrink-0">
                      <svg v-if="result.status === 'sent'" class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <svg v-else class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!isProcessing && results.length === 0" class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-gray-500">Upload a CSV file to get started</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="text-center text-sm text-gray-500">
          <p>WhatsApp Bot - Built with Vue 3, Vite, and VenomBot</p>
          <p class="mt-1">Please use responsibly and respect WhatsApp's terms of service.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'App',
  data() {
    return {
      activeTab: 'whatsapp', // 'whatsapp' or 'email'
      customMessage: '',
      emailSubject: '',
      selectedImage: null,
      selectedFile: null,
      isProcessing: false,
      isCheckingStatus: false,
      results: [],
      statistics: {
        total: 0,
        sent: 0,
        failed: 0
      },
      connectionStatus: {
        connected: false,
        ready: false
      },
      progressPercentage: 0,
      progressMessage: '',
      fileValidation: null,
      isValidatingFile: false
    }
  

  },
  
  mounted() {
    this.checkConnectionStatus()
    // Check connection status every 30 seconds
    setInterval(this.checkConnectionStatus, 30000)
  },
  
  methods: {
    async checkConnectionStatus() {
      this.isCheckingStatus = true
      try {
        const response = await axios.get('http://localhost:5000/api/status')
        this.connectionStatus = response.data
      } catch (error) {
        console.error('Error checking connection status:', error)
        this.connectionStatus = {
          connected: false,
          ready: false,
          error: 'Cannot connect to backend server'
        }
      } finally {
        this.isCheckingStatus = false
      }
    },
    handleImageSelect(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    this.selectedImage = file;
  } else {
    alert('Please upload a valid image file.');
    this.selectedImage = null;
  }
},

    
    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
        this.selectedFile = file
        this.clearResults()
        this.fileValidation = null
        // Validate file
        await this.validateFile(file)
      } else {
        alert('Please select a valid CSV or Excel file.')
        this.clearFile()
      }
    },

    async validateFile(file) {
      this.isValidatingFile = true
      try {
        const formData = new FormData()
        formData.append('csvFile', file)
        
        // Choose endpoint based on active tab
        const endpoint = this.activeTab === 'email' 
          ? 'http://localhost:5000/api/email/validate-file'
          : 'http://localhost:5000/api/validate-file'

        const response = await axios.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          this.fileValidation = response.data
        } else {
          console.error('Validation failed:', response.data.error)
          this.fileValidation = {
            validation: { isValid: false, suggestions: { required: response.data.error, optional: [] } },
            columns: [],
            totalColumns: 0
          }
        }
      } catch (error) {
        console.error('Error validating file:', error)
        this.fileValidation = {
          validation: { 
            isValid: false, 
            suggestions: { 
              required: error.response?.data?.error || 'Failed to validate file', 
              optional: [] 
            } 
          },
          columns: [],
          totalColumns: 0
        }
      } finally {
        this.isValidatingFile = false
      }
    },
    
    clearFile() {
      this.selectedFile = null
      this.fileValidation = null
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
      this.clearResults()
    },
    
    clearResults() {
      this.results = []
      this.statistics = {
        total: 0,
        sent: 0,
        failed: 0
      }
      this.progressPercentage = 0
      this.progressMessage = ''
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    async sendMessages() {
      if (!this.selectedFile) {
        alert('Please select a CSV file first.')
        return
      }
      
      if (this.activeTab === 'whatsapp' && !this.connectionStatus.connected) {
        alert('WhatsApp is not connected. Please scan the QR code in the backend terminal.')
        return
      }
      
      if (this.activeTab === 'email' && !this.emailSubject) {
        alert('Please enter an email subject.')
        return
      }
      
      this.isProcessing = true
      this.clearResults()
      this.progressPercentage = 10
      this.progressMessage = 'Uploading file...'
      
      try {
        const formData = new FormData();
        formData.append('csvFile', this.selectedFile);

        let endpoint;
        if (this.activeTab === 'email') {
           formData.append('subject', this.emailSubject);
           formData.append('htmlContent', this.customMessage);
           endpoint = 'http://localhost:5000/api/email/send-messages';
        } else {
           formData.append('customMessage', this.customMessage);
           if (this.selectedImage) {
              formData.append('imageFile', this.selectedImage);
           }
           endpoint = 'http://localhost:5000/api/send-messages';
        }
        
        this.progressPercentage = 30
        this.progressMessage = 'Processing file...'
        
        const response = await axios.post(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 minutes timeout
        })
        
        this.progressPercentage = 90
        this.progressMessage = 'Finalizing results...'
        
        if (response.data.success) {
          this.results = response.data.results
          this.statistics = response.data.statistics
          this.progressPercentage = 100
          this.progressMessage = 'Complete!'
          
          // Show success notification
          const successCount = this.statistics.sent
          const totalCount = this.statistics.total
          alert(`Messages sent successfully!\n${successCount}/${totalCount} messages delivered.`)
        } else {
          throw new Error(response.data.error || 'Unknown error occurred')
        }
        
      } catch (error) {
        console.error('Error sending messages:', error)
        
        let errorMessage = 'Failed to send messages. '
        
        if (error.response) {
          errorMessage += error.response.data.error || error.response.statusText
        } else if (error.request) {
          errorMessage += 'Cannot connect to server. Please make sure the backend is running.'
        } else {
          errorMessage += error.message
        }
        
        alert(errorMessage)
        
        this.progressPercentage = 0
        this.progressMessage = ''
      } finally {
        this.isProcessing = false
        
        // Clear progress after a delay
        setTimeout(() => {
          this.progressPercentage = 0
          this.progressMessage = ''
        }, 3000)
      }
    }
  }
}
</script>