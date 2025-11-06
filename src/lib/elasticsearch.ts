import { Client } from '@elastic/elasticsearch'

export const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  } : undefined,
  tls: process.env.ELASTICSEARCH_TLS === 'true' ? {
    rejectUnauthorized: false, // For development only
  } : undefined,
  maxRetries: 3,
  requestTimeout: 60000,
  pingTimeout: 3000,
})