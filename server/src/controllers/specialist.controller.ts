// import { Request, Response } from 'express';
// import { firestore } from '../config/firebase';

// const COLLECTION_NAME = 'specialists';

// export const createSpecialist = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { fullName, email, organization, expertiseAreas } = req.body;

//     if (!fullName || !email) {
//       res.status(400).json({
//         success: false,
//         error: 'Missing required fields: fullName, email',
//       });
//       return;
//     }

//     if (expertiseAreas && !Array.isArray(expertiseAreas)) {
//       res.status(400).json({
//         success: false,
//         error: 'expertiseAreas must be an array of strings',
//       });
//       return;
//     }

//     const newSpecialist = {
//       fullName,
//       email,
//       organization: organization || null,
//       expertiseAreas: expertiseAreas || [],
//       createdAt: new Date().toISOString(),
//     };

//     const docRef = await firestore.collection(COLLECTION_NAME).add(newSpecialist);

//     res.status(201).json({
//       success: true,
//       id: docRef.id,
//       data: { ...newSpecialist, id: docRef.id },
//     });
//   } catch (error) {
//     console.error('Error creating specialist:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create specialist',
//     });
//   }
// };

// export const listSpecialists = async (_req: Request, res: Response): Promise<void> => {
//   try {
//     const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').get();
//     const specialists = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//     res.status(200).json({
//       success: true,
//       data: specialists,
//     });
//   } catch (error) {
//     console.error('Error listing specialists:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch specialists',
//     });
//   }
// };

// export const getSpecialistById = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       res.status(400).json({
//         success: false,
//         error: 'Specialist id is required',
//       });
//       return;
//     }

//     const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();

//     if (!doc.exists) {
//       res.status(404).json({
//         success: false,
//         error: 'Specialist not found',
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       data: { id: doc.id, ...doc.data() },
//     });
//   } catch (error) {
//     console.error('Error fetching specialist:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch specialist',
//     });
//   }
// };

// export const updateSpecialist = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     if (!id) {
//       res.status(400).json({
//         success: false,
//         error: 'Specialist id is required',
//       });
//       return;
//     }

//     if (updates.expertiseAreas && !Array.isArray(updates.expertiseAreas)) {
//       res.status(400).json({
//         success: false,
//         error: 'expertiseAreas must be an array of strings',
//       });
//       return;
//     }

//     await firestore.collection(COLLECTION_NAME).doc(id).set(
//       {
//         ...updates,
//         updatedAt: new Date().toISOString(),
//       },
//       { merge: true },
//     );

//     res.status(200).json({
//       success: true,
//       message: 'Specialist updated successfully',
//     });
//   } catch (error) {
//     console.error('Error updating specialist:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to update specialist',
//     });
//   }
// };

// export const deleteSpecialist = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       res.status(400).json({
//         success: false,
//         error: 'Specialist id is required',
//       });
//       return;
//     }

//     await firestore.collection(COLLECTION_NAME).doc(id).delete();

//     res.status(200).json({
//       success: true,
//       message: 'Specialist deleted successfully',
//     });
//   } catch (error) {
//     console.error('Error deleting specialist:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to delete specialist',
//     });
//   }
// };


