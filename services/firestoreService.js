const { db } = require('../config/firebase');

/**
 * Firebase Firestore Service
 * Handles all database operations for Firestore
 */
class FirestoreService {
  /**
   * Create a new document in a collection
   * @param {string} collection - Collection name
   * @param {object} data - Document data
   * @param {string} docId - Optional document ID
   */
  static async createDocument(collection, data, docId = null) {
    try {
      let docRef;
      if (docId) {
        docRef = db.collection(collection).doc(docId);
        await docRef.set(data);
      } else {
        docRef = await db.collection(collection).add(data);
      }
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Get a single document from collection
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   */
  static async getDocument(collection, docId) {
    try {
      const doc = await db.collection(collection).doc(docId).get();
      if (!doc.exists) {
        return null;
      }
      return { ...doc.data(), id: doc.id };
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Get all documents from a collection with optional filters and pagination
   * @param {string} collection - Collection name
   * @param {array} whereConditions - Array of [field, operator, value] for filtering
   * @param {string} orderBy - Field to order by
   * @param {string} direction - 'asc' or 'desc'
   * @param {number} limit - Maximum number of documents to return (0 = no limit)
   * @param {string} startAfter - Document ID to start after for pagination
   */
  static async getDocuments(collection, whereConditions = [], orderBy = null, direction = 'asc', limit = 0, startAfter = null) {
    try {
      let query = db.collection(collection);

      // Apply where conditions
      for (const [field, operator, value] of whereConditions) {
        query = query.where(field, operator, value);
      }

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy, direction);
      }

      // Apply pagination limit
      if (limit > 0) {
        query = query.limit(limit);
      }

      // Start after cursor pagination
      if (startAfter) {
        const startDoc = await db.collection(collection).doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ ...doc.data(), id: doc.id });
      });
      return documents;
    } catch (error) {
      console.error(`Error getting documents from ${collection}:`, error);
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }

  /**
   * Update a document in collection
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @param {object} data - Data to update
   */
  static async updateDocument(collection, docId, data) {
    try {
      await db.collection(collection).doc(docId).update({
        ...data,
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Delete a document from collection
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   */
  static async deleteDocument(collection, docId) {
    try {
      await db.collection(collection).doc(docId).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Query documents by field
   * @param {string} collection - Collection name
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {number} limit - Max documents to return (0 = no limit)
   */
  static async getByField(collection, field, value, limit = 0) {
    try {
      let query = db.collection(collection).where(field, '==', value);
      if (limit > 0) {
        query = query.limit(limit);
      }
      const snapshot = await query.get();
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ ...doc.data(), id: doc.id });
      });
      return documents;
    } catch (error) {
      console.error(`Error querying ${collection} by ${field}:`, error);
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  /**
   * Batch write operation
   * @param {array} operations - Array of {collection, docId, data, type: 'set'|'update'|'delete'}
   */
  static async batchWrite(operations) {
    try {
      const batch = db.batch();
      for (const op of operations) {
        const docRef = db.collection(op.collection).doc(op.docId);
        if (op.type === 'set') {
          batch.set(docRef, op.data);
        } else if (op.type === 'update') {
          batch.update(docRef, op.data);
        } else if (op.type === 'delete') {
          batch.delete(docRef);
        }
      }
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error in batch write:', error);
      throw new Error(`Failed to perform batch operation: ${error.message}`);
    }
  }
}

module.exports = FirestoreService;
